import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useClients } from "../utils/useClients";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { PlusIcon, TrashIcon, EditIcon } from "../components/Icons";
import { fullName, todayISO } from "../utils/format";
import type { Aircraft, CalendarEvent, CalendarSessionType, Classroom } from "../types";

const NEW_OPTION = "__new__";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(monthDate: Date): (Date | null)[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const emptyForm = {
  startTime: "",
  endTime: "",
  sessionType: "flight" as CalendarSessionType,
  aircraftId: "",
  classroomId: "",
  studentClientId: "",
  instructorName: "",
};

export default function TrainingCalendar() {
  const { user } = useAuth();
  const canEdit = user?.role === "administrator" || user?.role === "instructor";
  const { clients } = useClients();

  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  function loadResources() {
    api.aircraft.list().then(setAircraft).catch(() => undefined);
    api.classrooms.list().then(setClassrooms).catch(() => undefined);
  }

  useEffect(loadResources, []);

  function load() {
    setLoading(true);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const start = toISODate(new Date(year, month, 1));
    const end = toISODate(new Date(year, month + 1, 0));
    api.calendar
      .list({ start, end })
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [monthDate]);

  const weeks = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const today = todayISO();
  const selectedEvents = (eventsByDate.get(selectedDate) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));

  function goToMonth(delta: number) {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(ev: CalendarEvent) {
    setSelectedDate(ev.date);
    setEditingId(ev.id);
    setForm({
      startTime: ev.startTime,
      endTime: ev.endTime,
      sessionType: ev.sessionType,
      aircraftId: ev.aircraftId ?? "",
      classroomId: ev.classroomId ?? "",
      studentClientId: ev.studentClientId,
      instructorName: ev.instructorName,
    });
    setShowForm(true);
  }

  async function handleAircraftSelect(value: string) {
    if (value !== NEW_OPTION) {
      setForm((f) => ({ ...f, aircraftId: value }));
      return;
    }
    const name = prompt("Aircraft name (e.g. N12345 — Cessna 172)");
    if (!name || !name.trim()) return;
    try {
      const created = await api.aircraft.create(name.trim());
      setAircraft((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, aircraftId: created.id }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleClassroomSelect(value: string) {
    if (value !== NEW_OPTION) {
      setForm((f) => ({ ...f, classroomId: value }));
      return;
    }
    const name = prompt("Classroom name (e.g. Briefing Room A)");
    if (!name || !name.trim()) return;
    try {
      const created = await api.classrooms.create(name.trim());
      setClassrooms((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, classroomId: created.id }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: selectedDate,
        aircraftId: form.sessionType === "flight" ? form.aircraftId || null : null,
        classroomId: form.sessionType === "ground" ? form.classroomId || null : null,
      };
      if (editingId) {
        await api.calendar.update(editingId, payload);
      } else {
        await api.calendar.create(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(ev: CalendarEvent) {
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.calendar.remove(ev.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Lesson and event schedule" />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => goToMonth(-1)}
                className="rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ←
              </button>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{monthLabel(monthDate)}</h2>
              <button
                onClick={() => goToMonth(1)}
                className="rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-medium uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-2">
                  {w}
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {weeks.map((week, i) => (
                <div key={i} className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
                  {week.map((day, j) => {
                    if (!day) return <div key={j} className="min-h-20 bg-slate-50/50 dark:bg-slate-950/40" />;
                    const iso = toISODate(day);
                    const dayEvents = eventsByDate.get(iso) ?? [];
                    const isSelected = iso === selectedDate;
                    const isToday = iso === today;
                    return (
                      <button
                        key={j}
                        onClick={() => setSelectedDate(iso)}
                        className={`min-h-20 p-1.5 text-left align-top transition-colors ${
                          isSelected ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                            isToday ? "bg-brand-600 text-white font-semibold" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <p
                              key={ev.id}
                              className="truncate rounded bg-brand-600/10 px-1 py-0.5 text-[11px] font-medium text-brand-700 dark:text-brand-300"
                            >
                              {ev.title}
                            </p>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-[11px] text-slate-400">+{dayEvents.length - 3} more</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              {canEdit && (
                <Button variant="secondary" onClick={startAdd} className="!px-2.5 !py-1.5">
                  <PlusIcon width={14} height={14} /> Add
                </Button>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : selectedEvents.length === 0 ? (
              <p className="text-sm text-slate-400">No events scheduled.</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{ev.title}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              ev.sessionType === "flight"
                                ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            {ev.sessionType === "flight" ? "Flight" : "Ground"}
                          </span>
                        </div>
                        {(ev.startTime || ev.endTime) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ev.startTime}
                            {ev.startTime && ev.endTime ? " – " : ""}
                            {ev.endTime}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">
                          Student: {fullName(clients.find((c) => c.id === ev.studentClientId) ?? { firstName: "Unknown", lastName: "" })}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">Instructor: {ev.instructorName}</p>
                        {ev.sessionType === "flight" && ev.aircraftId && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Aircraft: {aircraft.find((a) => a.id === ev.aircraftId)?.name ?? "Unknown"}
                          </p>
                        )}
                        {ev.sessionType === "ground" && ev.classroomId && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Classroom: {classrooms.find((c) => c.id === ev.classroomId)?.name ?? "Unknown"}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => startEdit(ev)}
                            title="Edit"
                          >
                            <EditIcon width={15} height={15} />
                          </button>
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                            onClick={() => remove(ev)}
                            title="Delete"
                          >
                            <TrashIcon width={15} height={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showForm && canEdit && (
        <Card className="p-5 mt-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Session Type">
              <select
                className={inputClass}
                value={form.sessionType}
                onChange={(e) => setForm({ ...form, sessionType: e.target.value as CalendarSessionType })}
                required
              >
                <option value="flight">Flight</option>
                <option value="ground">Ground</option>
              </select>
            </Field>
            {form.sessionType === "flight" ? (
              <Field label="Aircraft">
                <select
                  className={inputClass}
                  value={form.aircraftId}
                  onChange={(e) => handleAircraftSelect(e.target.value)}
                  required
                >
                  <option value="">Select aircraft…</option>
                  {aircraft.filter((a) => a.active || a.id === form.aircraftId).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                  <option value={NEW_OPTION}>+ Add new aircraft…</option>
                </select>
              </Field>
            ) : (
              <Field label="Classroom">
                <select
                  className={inputClass}
                  value={form.classroomId}
                  onChange={(e) => handleClassroomSelect(e.target.value)}
                  required
                >
                  <option value="">Select classroom…</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={NEW_OPTION}>+ Add new classroom…</option>
                </select>
              </Field>
            )}
            <Field label="Student">
              <select
                className={inputClass}
                value={form.studentClientId}
                onChange={(e) => setForm({ ...form, studentClientId: e.target.value })}
                required
              >
                <option value="">Select student…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {fullName(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Instructor">
              <input
                className={inputClass}
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                required
              />
            </Field>
            <Field label="Start Time">
              <input
                type="time"
                className={inputClass}
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </Field>
            <Field label="End Time">
              <input
                type="time"
                className={inputClass}
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {editingId ? "Save Changes" : "Add Event"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
