import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import type { Aircraft } from "../types";

interface AircraftFormState {
  id?: string;
  tailNumber: string;
  makeModel: string;
  category: string;
  isComplex: boolean;
  isHighPerformance: boolean;
  isTailwheel: boolean;
}

const emptyForm: AircraftFormState = {
  tailNumber: "",
  makeModel: "",
  category: "Airplane Single-Engine Land",
  isComplex: false,
  isHighPerformance: false,
  isTailwheel: false,
};

export default function AircraftPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AircraftFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.aircraft
      .list()
      .then(setAircraft)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (form.id) {
        await api.aircraft.update(form.id, form);
      } else {
        await api.aircraft.create(form);
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: Aircraft) {
    setForm({
      id: a.id,
      tailNumber: a.tailNumber,
      makeModel: a.makeModel,
      category: a.category,
      isComplex: a.isComplex,
      isHighPerformance: a.isHighPerformance,
      isTailwheel: a.isTailwheel,
    });
    setShowForm(true);
  }

  async function remove(a: Aircraft) {
    if (!confirm(`Delete aircraft ${a.tailNumber}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.aircraft.remove(a.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...aircraft].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber));

  return (
    <div>
      <PageHeader
        title="Aircraft"
        subtitle="Training fleet used on logbook entries"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> Add Aircraft
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tail Number">
              <input
                className={inputClass}
                value={form.tailNumber}
                onChange={(e) => setForm({ ...form, tailNumber: e.target.value })}
                placeholder="e.g. N12345"
                required
              />
            </Field>
            <Field label="Make / Model">
              <input
                className={inputClass}
                value={form.makeModel}
                onChange={(e) => setForm({ ...form, makeModel: e.target.value })}
                placeholder="e.g. Cessna 172S"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Category / Class">
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Airplane Single-Engine Land"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-700"
                  checked={form.isComplex}
                  onChange={(e) => setForm({ ...form, isComplex: e.target.checked })}
                />
                Complex
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-700"
                  checked={form.isHighPerformance}
                  onChange={(e) => setForm({ ...form, isHighPerformance: e.target.checked })}
                />
                High Performance
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-700"
                  checked={form.isTailwheel}
                  onChange={(e) => setForm({ ...form, isTailwheel: e.target.checked })}
                />
                Tailwheel
              </label>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Create Aircraft"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading aircraft…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No aircraft yet. Add one to get started.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Tail Number</th>
                  <th className="px-5 py-2 font-medium">Make / Model</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Category</th>
                  <th className="px-5 py-2 font-medium">Notes</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-2.5 font-mono font-medium text-slate-800 dark:text-slate-100">{a.tailNumber}</td>
                    <td className="px-5 py-2.5 text-slate-500">{a.makeModel || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{a.category || "—"}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {a.isComplex && <Badge tone="blue">Complex</Badge>}
                        {a.isHighPerformance && <Badge tone="blue">High Perf</Badge>}
                        {a.isTailwheel && <Badge tone="blue">Tailwheel</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                          onClick={() => startEdit(a)}
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          onClick={() => remove(a)}
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
