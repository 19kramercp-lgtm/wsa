import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, TrashIcon } from "../components/Icons";
import { fullName, formatDate, todayISO } from "../utils/format";
import type {
  Aircraft,
  CertificateTrack,
  Client,
  EndorsementRecord,
  EndorsementTemplate,
  Instructor,
  LogbookEntry,
  StudentRequirementsResponse,
} from "../types";

type Tab = "logbook" | "requirements" | "endorsements";

const TABS: { id: Tab; label: string }[] = [
  { id: "logbook", label: "Logbook" },
  { id: "requirements", label: "Requirements" },
  { id: "endorsements", label: "Endorsements" },
];

const CERTIFICATE_LABELS: Record<CertificateTrack, string> = {
  private: "Private Pilot",
  instrument: "Instrument Rating",
  commercial: "Commercial Pilot",
  cfi: "Certificated Flight Instructor",
};

function hours(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default function StudentProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("logbook");

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    api.clients
      .list()
      .then((clients) => setClient(clients.find((c) => c.id === clientId) ?? null))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (!clientId) return null;
  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!client) return <Alert tone="error">Student not found.</Alert>;

  return (
    <div>
      <PageHeader
        title={fullName(client)}
        subtitle={[client.phone, client.email].filter(Boolean).join(" · ") || "Training record"}
        actions={
          <Link to="/training/students" className="text-sm text-brand-600 hover:underline">
            ← All Students
          </Link>
        }
      />

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "logbook" && <LogbookTab clientId={clientId} />}
      {tab === "requirements" && <RequirementsTab clientId={clientId} />}
      {tab === "endorsements" && <EndorsementsTab clientId={clientId} />}
    </div>
  );
}

const emptyLogbookForm = {
  id: undefined as string | undefined,
  date: todayISO(),
  aircraftId: "",
  instructorId: "",
  route: "",
  totalTime: "",
  picTime: "",
  soloTime: "",
  crossCountryTime: "",
  nightTime: "",
  actualInstrumentTime: "",
  simulatedInstrumentTime: "",
  dualReceived: "",
  dayLandings: "",
  nightLandings: "",
  remarks: "",
};

function LogbookTab({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [totals, setTotals] = useState<Awaited<ReturnType<typeof api.logbook.totals>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyLogbookForm);

  function load() {
    setLoading(true);
    Promise.all([
      api.logbook.list({ clientId }),
      api.aircraft.list(),
      api.instructors.list(),
      api.logbook.totals(clientId),
    ])
      .then(([e, a, i, t]) => {
        setEntries(e);
        setAircraft(a);
        setInstructors(i);
        setTotals(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  const aircraftById = useMemo(() => new Map(aircraft.map((a) => [a.id, a])), [aircraft]);
  const instructorById = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);
  const activeAircraft = useMemo(() => aircraft.filter((a) => a.active), [aircraft]);
  const activeInstructors = useMemo(() => instructors.filter((i) => i.active), [instructors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        clientId,
        date: form.date,
        aircraftId: form.aircraftId || null,
        instructorId: form.instructorId || null,
        route: form.route,
        totalTime: Number(form.totalTime) || 0,
        picTime: Number(form.picTime) || 0,
        soloTime: Number(form.soloTime) || 0,
        crossCountryTime: Number(form.crossCountryTime) || 0,
        nightTime: Number(form.nightTime) || 0,
        actualInstrumentTime: Number(form.actualInstrumentTime) || 0,
        simulatedInstrumentTime: Number(form.simulatedInstrumentTime) || 0,
        dualReceived: Number(form.dualReceived) || 0,
        dayLandings: Number(form.dayLandings) || 0,
        nightLandings: Number(form.nightLandings) || 0,
        remarks: form.remarks,
      };
      if (form.id) {
        await api.logbook.update(form.id, payload);
      } else {
        await api.logbook.create(payload);
      }
      setForm(emptyLogbookForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: LogbookEntry) {
    setForm({
      id: entry.id,
      date: entry.date,
      aircraftId: entry.aircraftId ?? "",
      instructorId: entry.instructorId ?? "",
      route: entry.route,
      totalTime: String(entry.totalTime || ""),
      picTime: String(entry.picTime || ""),
      soloTime: String(entry.soloTime || ""),
      crossCountryTime: String(entry.crossCountryTime || ""),
      nightTime: String(entry.nightTime || ""),
      actualInstrumentTime: String(entry.actualInstrumentTime || ""),
      simulatedInstrumentTime: String(entry.simulatedInstrumentTime || ""),
      dualReceived: String(entry.dualReceived || ""),
      dayLandings: String(entry.dayLandings || ""),
      nightLandings: String(entry.nightLandings || ""),
      remarks: entry.remarks,
    });
    setShowForm(true);
  }

  async function remove(entry: LogbookEntry) {
    if (!confirm(`Delete this logbook entry from ${formatDate(entry.date)}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.logbook.remove(entry.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const timeField = (label: string, key: keyof typeof emptyLogbookForm) => (
    <Field label={label}>
      <input
        type="number"
        step="0.1"
        min="0"
        className={inputClass}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder="0.0"
      />
    </Field>
  );

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {totals && (
        <Card className="p-5 mb-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Logged Totals</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            {[
              ["Total", totals.totalTime],
              ["PIC", totals.picTime],
              ["Solo", totals.soloTime],
              ["Cross-Country", totals.crossCountryTime],
              ["Night", totals.nightTime],
              ["Instrument", totals.instrumentTime],
              ["Dual Received", totals.dualReceived],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{hours(value as number)}</p>
              </div>
            ))}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Landings (Day/Night)</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {totals.dayLandings} / {totals.nightLandings}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setForm(emptyLogbookForm);
            setShowForm((s) => !s);
          }}
        >
          Add Logbook Entry
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Aircraft">
                <select
                  className={inputClass}
                  value={form.aircraftId}
                  onChange={(e) => setForm({ ...form, aircraftId: e.target.value })}
                >
                  <option value="">Select aircraft…</option>
                  {activeAircraft.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tailNumber} — {a.makeModel}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Instructor">
                <select
                  className={inputClass}
                  value={form.instructorId}
                  onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
                >
                  <option value="">Solo / none…</option>
                  {activeInstructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {fullName(i)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Route">
              <input
                className={inputClass}
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                placeholder="e.g. KABC-KXYZ-KABC or Local"
              />
            </Field>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {timeField("Total Time", "totalTime")}
              {timeField("PIC", "picTime")}
              {timeField("Solo", "soloTime")}
              {timeField("Cross-Country", "crossCountryTime")}
              {timeField("Night", "nightTime")}
              {timeField("Actual Instrument", "actualInstrumentTime")}
              {timeField("Simulated Instrument", "simulatedInstrumentTime")}
              {timeField("Dual Received", "dualReceived")}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Day Landings">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={form.dayLandings}
                  onChange={(e) => setForm({ ...form, dayLandings: e.target.value })}
                  placeholder="0"
                />
              </Field>
              <Field label="Night Landings">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={form.nightLandings}
                  onChange={(e) => setForm({ ...form, nightLandings: e.target.value })}
                  placeholder="0"
                />
              </Field>
            </div>

            <Field label="Remarks (optional)">
              <input
                className={inputClass}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="e.g. Steep turns, slow flight, stalls"
              />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Add Entry"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyLogbookForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading logbook…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No logbook entries yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Aircraft</th>
                  <th className="px-5 py-2 font-medium">Instructor</th>
                  <th className="px-5 py-2 font-medium">Route</th>
                  <th className="px-5 py-2 font-medium text-right">Total</th>
                  <th className="px-5 py-2 font-medium text-right">Landings</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-2.5 text-slate-500">{formatDate(entry.date)}</td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {entry.aircraftId ? aircraftById.get(entry.aircraftId)?.tailNumber ?? "—" : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {entry.instructorId ? fullName(instructorById.get(entry.instructorId) ?? { firstName: "—", lastName: "" }) : "Solo"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{entry.route || "—"}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-slate-800 dark:text-slate-100">
                      {hours(entry.totalTime)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-500">
                      {entry.dayLandings + entry.nightLandings > 0 ? `${entry.dayLandings}/${entry.nightLandings}` : "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                          onClick={() => startEdit(entry)}
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          onClick={() => remove(entry)}
                          title="Delete"
                        >
                          <TrashIcon width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function RequirementsTab({ clientId }: { clientId: string }) {
  const [data, setData] = useState<StudentRequirementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<CertificateTrack>("private");

  function load() {
    setLoading(true);
    api.requirements
      .forStudent(clientId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  async function updateCheck(requirementId: string, patch: { met?: boolean; note?: string; dateMet?: string | null }) {
    if (!data) return;
    // Optimistic update so typing/clicking feels immediate.
    setData({
      ...data,
      byCertificate: data.byCertificate.map((group) => ({
        ...group,
        requirements: group.requirements.map((r) => (r.id === requirementId ? { ...r, ...patch } : r)),
      })),
    });
    try {
      await api.requirements.setCheck(clientId, requirementId, patch);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }

  if (loading || !data) return <p className="text-sm text-slate-500">Loading requirements…</p>;

  const group = data.byCertificate.find((g) => g.certificate === certificate)!;
  const metCount = group.requirements.filter((r) => r.met).length;

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Logged Totals</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Reference only — compare against the checklist below when deciding whether a requirement is met.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          {[
            ["Total", data.totals.totalTime],
            ["PIC", data.totals.picTime],
            ["Solo", data.totals.soloTime],
            ["Cross-Country", data.totals.crossCountryTime],
            ["Night", data.totals.nightTime],
            ["Instrument", data.totals.instrumentTime],
            ["Dual Received", data.totals.dualReceived],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{hours(value as number)}</p>
            </div>
          ))}
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Landings (Day/Night)</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {data.totals.dayLandings} / {data.totals.nightLandings}
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-fit flex-wrap">
        {data.byCertificate.map((g) => (
          <button
            key={g.certificate}
            onClick={() => setCertificate(g.certificate)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              certificate === g.certificate
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {CERTIFICATE_LABELS[g.certificate]}
          </button>
        ))}
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">{CERTIFICATE_LABELS[certificate]} — FAR 61 Requirements</h2>
          <Badge tone={metCount === group.requirements.length ? "green" : "slate"}>
            {metCount} / {group.requirements.length} met
          </Badge>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {group.requirements.map((r) => (
            <div key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-3">
              <label className="flex items-start gap-3 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300 dark:border-slate-700"
                  checked={r.met}
                  onChange={(e) =>
                    updateCheck(r.id, { met: e.target.checked, dateMet: e.target.checked ? todayISO() : null })
                  }
                />
                <span>
                  <span className="block text-xs font-mono text-slate-400">{r.reg}</span>
                  <span className="block text-sm text-slate-700 dark:text-slate-200">{r.text}</span>
                  {(r.targetHours || r.targetCount) && (
                    <span className="block text-xs text-slate-400 mt-0.5">
                      Target: {r.targetHours ? `${r.targetHours} hrs` : ""}
                      {r.targetHours && r.targetCount ? " · " : ""}
                      {r.targetCount ? `${r.targetCount} event${r.targetCount > 1 ? "s" : ""}` : ""}
                    </span>
                  )}
                </span>
              </label>
              <div className="flex gap-2 sm:w-80 shrink-0">
                <input
                  type="date"
                  className={`${inputClass} !py-1.5 text-xs`}
                  value={r.dateMet ?? ""}
                  onChange={(e) => updateCheck(r.id, { dateMet: e.target.value || null })}
                />
                <input
                  className={`${inputClass} !py-1.5 text-xs`}
                  value={r.note}
                  onChange={(e) => updateCheck(r.id, { note: e.target.value })}
                  placeholder="Note (optional)"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const emptyEndorsementForm = {
  templateId: "",
  title: "",
  farReference: "",
  instructorId: "",
  dateGiven: todayISO(),
  notes: "",
};

function EndorsementsTab({ clientId }: { clientId: string }) {
  const [endorsements, setEndorsements] = useState<EndorsementRecord[]>([]);
  const [templates, setTemplates] = useState<EndorsementTemplate[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyEndorsementForm);

  function load() {
    setLoading(true);
    Promise.all([api.endorsements.list({ clientId }), api.endorsements.templates(), api.instructors.list()])
      .then(([e, t, i]) => {
        setEndorsements(e);
        setTemplates(t);
        setInstructors(i);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

  const instructorById = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);
  const activeInstructors = useMemo(() => instructors.filter((i) => i.active), [instructors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.endorsements.create({
        clientId,
        templateId: form.templateId || null,
        title: form.templateId ? undefined : form.title,
        farReference: form.templateId ? undefined : form.farReference,
        instructorId: form.instructorId || null,
        dateGiven: form.dateGiven,
        notes: form.notes,
      });
      setForm(emptyEndorsementForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: EndorsementRecord) {
    if (!confirm(`Delete this endorsement (${record.title})? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.endorsements.remove(record.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const sorted = [...endorsements].sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
  const today = todayISO();

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setForm(emptyEndorsementForm);
            setShowForm((s) => !s);
          }}
        >
          Add Endorsement
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Endorsement">
                <select
                  className={inputClass}
                  value={form.templateId}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                >
                  <option value="">Custom endorsement…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.farReference})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {!form.templateId && (
              <>
                <Field label="Title">
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Additional training after unsatisfactory maneuver"
                    required
                  />
                </Field>
                <Field label="FAR Reference">
                  <input
                    className={inputClass}
                    value={form.farReference}
                    onChange={(e) => setForm({ ...form, farReference: e.target.value })}
                    placeholder="e.g. 61.87(c)"
                  />
                </Field>
              </>
            )}
            <Field label="Given By">
              <select
                className={inputClass}
                value={form.instructorId}
                onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
              >
                <option value="">Select instructor…</option>
                {activeInstructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {fullName(i)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date Given">
              <input
                type="date"
                className={inputClass}
                value={form.dateGiven}
                onChange={(e) => setForm({ ...form, dateGiven: e.target.value })}
                required
              />
            </Field>
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
                Add Endorsement
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyEndorsementForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading endorsements…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No endorsements recorded yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Endorsement</th>
                  <th className="px-5 py-2 font-medium">FAR</th>
                  <th className="px-5 py-2 font-medium">Given By</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Expires</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((record) => {
                  const expired = record.expiresOn ? record.expiresOn < today : false;
                  return (
                    <tr key={record.id}>
                      <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{record.title}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-400">{record.farReference || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-500">
                        {record.instructorId ? fullName(instructorById.get(record.instructorId) ?? { firstName: "—", lastName: "" }) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(record.dateGiven)}</td>
                      <td className="px-5 py-2.5">
                        {record.expiresOn ? (
                          <Badge tone={expired ? "red" : "slate"}>{formatDate(record.expiresOn)}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                            onClick={() => remove(record)}
                            title="Delete"
                          >
                            <TrashIcon width={16} height={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
