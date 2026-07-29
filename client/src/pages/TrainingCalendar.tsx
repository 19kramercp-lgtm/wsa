import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useClients } from "../utils/useClients";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { PlusIcon, TrashIcon, EditIcon } from "../components/Icons";
import { fullName, todayISO } from "../utils/format";
import type { CalendarEvent } from "../types";

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

const emptyForm = { title: "", startTime: "", endTime: "", studentClientId: "", instructorName: "", notes: "" };

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
      title: ev.title,
      startTime: ev.startTime,
      endTime: ev.endTime,
      studentClientId: ev.studentClientId ?? "",
      instructorName: ev.instructorName,
      notes: ev.notes,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, date: selectedDate, studentClientId: form.studentClientId || null };
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
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{ev.title}</p>
                        {(ev.startTime || ev.endTime) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ev.startTime}
                            {ev.startTime && ev.endTime ? " – " : ""}
                            {ev.endTime}
                          </p>
                        )}
                        {ev.studentClientId && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Student: {fullName(clients.find((c) => c.id === ev.studentClientId) ?? { firstName: "Unknown", lastName: "" })}
                          </p>
                        )}
                        {ev.instructorName && <p className="text-xs text-slate-500 mt-0.5">Instructor: {ev.instructorName}</p>}
                        {ev.notes && <p className="text-xs text-slate-400 mt-1">{ev.notes}</p>}
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
            <div className="sm:col-span-2">
              <Field label="Title">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Dual instruction — pattern work"
                  required
                  autoFocus
                />
              </Field>
            </div>
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Student (optional)">
              <select
                className={inputClass}
                value={form.studentClientId}
                onChange={(e) => setForm({ ...form, studentClientId: e.target.value })}
              >
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {fullName(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start Time (optional)">
              <input
                type="time"
                className={inputClass}
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </Field>
            <Field label="End Time (optional)">
              <input
                type="time"
                className={inputClass}
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Instructor (optional)">
                <input
                  className={inputClass}
                  value={form.instructorName}
                  onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes (optional)">
                <input
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
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
