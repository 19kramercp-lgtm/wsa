import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { formatDate } from "../utils/format";
import type { Aircraft as AircraftType } from "../types";

interface AircraftFormState {
  id?: string;
  name: string;
  active: boolean;
}

const emptyForm: AircraftFormState = { name: "", active: true };

export default function Aircraft() {
  const { user } = useAuth();
  const canEdit = user?.role === "administrator" || user?.role === "instructor";

  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
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
        await api.aircraft.update(form.id, { name: form.name, active: form.active });
      } else {
        await api.aircraft.create(form.name);
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

  function startEdit(a: AircraftType) {
    setForm({ id: a.id, name: a.name, active: a.active });
    setShowForm(true);
  }

  async function remove(a: AircraftType) {
    if (!confirm(`Delete ${a.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.aircraft.remove(a.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...aircraft].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Aircraft"
        subtitle="Fleet used for flight sessions on the Calendar"
        actions={
          canEdit ? (
            <Button
              onClick={() => {
                setForm(emptyForm);
                setShowForm((s) => !s);
              }}
            >
              <PlusIcon width={16} height={16} /> Add Aircraft
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {showForm && canEdit && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Name">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. N12345 — Cessna 172"
                  required
                  autoFocus
                />
              </Field>
            </div>
            {form.id && (
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-700"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Active (shown when scheduling new flight sessions)
                </label>
              </div>
            )}
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Add Aircraft"}
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
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium hidden lg:table-cell">Added</th>
                  {canEdit && <th className="px-5 py-2 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{a.name}</td>
                    <td className="px-5 py-2.5">
                      <Badge tone={a.active ? "green" : "slate"}>{a.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 hidden lg:table-cell">{formatDate(a.createdAt.slice(0, 10))}</td>
                    {canEdit && (
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
                    )}
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
