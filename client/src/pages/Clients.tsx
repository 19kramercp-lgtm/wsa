import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { formatDate } from "../utils/format";
import type { Client } from "../types";

interface ClientFormState {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

const emptyClientForm: ClientFormState = { name: "", phone: "", email: "", address: "" };

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientFormState>(emptyClientForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.clients
      .list()
      .then(setClients)
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
        await api.clients.update(form.id, form);
      } else {
        await api.clients.create(form);
      }
      setForm(emptyClientForm);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: Client) {
    setForm({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address });
    setShowForm(true);
  }

  async function remove(c: Client) {
    if (!confirm(`Delete client ${c.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.clients.remove(c.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Students and customers used as payers/payees on revenue and expense entries"
        actions={
          <Button
            onClick={() => {
              setForm(emptyClientForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> Add Client
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
            <Field label="Client Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jane Smith"
                required
              />
            </Field>
            <Field label="Phone Number">
              <input
                type="tel"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. (555) 123-4567"
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. jane@example.com"
              />
            </Field>
            <Field label="Home Address">
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. 123 Main St, Anytown, ST 12345"
              />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Create Client"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyClientForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading clients…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No clients yet. Add one to get started.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Phone</th>
                  <th className="px-5 py-2 font-medium">Email</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Address</th>
                  <th className="px-5 py-2 font-medium hidden lg:table-cell">Added</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                    <td className="px-5 py-2.5 text-slate-500">{c.phone || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{c.email || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{c.address || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden lg:table-cell">{formatDate(c.createdAt.slice(0, 10))}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                          onClick={() => startEdit(c)}
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          onClick={() => remove(c)}
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
