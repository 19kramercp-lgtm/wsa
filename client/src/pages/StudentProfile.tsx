import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { TrashIcon } from "../components/Icons";
import { fullName, formatDate, todayISO } from "../utils/format";
import type { CertificateTrack, Client, EndorsementRecord, EndorsementTemplate, StudentRequirementsResponse } from "../types";

type Tab = "requirements" | "endorsements";

const TABS: { id: Tab; label: string }[] = [
  { id: "requirements", label: "FAR Requirements" },
  { id: "endorsements", label: "Endorsements" },
];

const CERTIFICATE_LABELS: Record<CertificateTrack, string> = {
  private: "Private Pilot",
  instrument: "Instrument Rating",
  commercial: "Commercial Pilot",
  cfi: "Certificated Flight Instructor",
};

export default function StudentProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("requirements");

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

      {tab === "requirements" && <RequirementsTab clientId={clientId} />}
      {tab === "endorsements" && <EndorsementsTab clientId={clientId} />}
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
  instructorName: "",
  dateGiven: todayISO(),
  notes: "",
};

function EndorsementsTab({ clientId }: { clientId: string }) {
  const [endorsements, setEndorsements] = useState<EndorsementRecord[]>([]);
  const [templates, setTemplates] = useState<EndorsementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyEndorsementForm);

  function load() {
    setLoading(true);
    Promise.all([api.endorsements.list({ clientId }), api.endorsements.templates()])
      .then(([e, t]) => {
        setEndorsements(e);
        setTemplates(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]);

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
        instructorName: form.instructorName,
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
              <Field label="Endorsement (FAA Advisory Circular 61-65)">
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
              <input
                className={inputClass}
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                placeholder="Instructor name"
              />
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
                      <td className="px-5 py-2.5 text-slate-500">{record.instructorName || "—"}</td>
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
