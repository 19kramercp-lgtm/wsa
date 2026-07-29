import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useClients } from "../utils/useClients";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { fullName, formatDate } from "../utils/format";
import type { SafeUser, UserRole } from "../types";

interface UserFormState {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  clientId: string;
}

const emptyForm: UserFormState = { name: "", email: "", password: "", role: "instructor", clientId: "" };

const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  instructor: "Instructor",
  student: "Student",
};

const ROLE_TONES: Record<UserRole, "blue" | "amber" | "slate"> = {
  administrator: "blue",
  instructor: "amber",
  student: "slate",
};

export default function UserAccounts() {
  const { user: currentUser } = useAuth();
  const { clients } = useClients();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.users
      .list()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        clientId: form.role === "student" ? form.clientId || null : null,
        ...(form.password ? { password: form.password } : {}),
      };
      if (form.id) {
        await api.users.update(form.id, payload);
      } else {
        await api.users.create({ ...payload, password: form.password });
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(u: SafeUser) {
    setForm({ id: u.id, name: u.name, email: u.email, password: "", role: u.role, clientId: u.clientId ?? "" });
    setShowForm(true);
  }

  async function remove(u: SafeUser) {
    if (!confirm(`Delete the account for ${u.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.users.remove(u.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="User Accounts"
        subtitle="Administrators can see accounting and training; instructors and students only see training"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> Add Account
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
            <Field label="Full Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Role">
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="administrator">Administrator</option>
                <option value="instructor">Instructor</option>
                <option value="student">Student</option>
              </select>
            </Field>
            {form.role === "student" && (
              <Field label="Linked Student Record (optional)">
                <select
                  className={inputClass}
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                >
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {fullName(c)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field
                label={form.id ? "New Password (optional)" : "Password"}
                hint="At least 6 characters"
              >
                <input
                  type="password"
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!form.id}
                  minLength={6}
                />
              </Field>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Create Account"}
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
        <p className="text-sm text-slate-500">Loading accounts…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No accounts yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Email</th>
                  <th className="px-5 py-2 font-medium">Role</th>
                  <th className="px-5 py-2 font-medium hidden lg:table-cell">Added</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                      {u.name}
                      {u.id === currentUser?.id && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{u.email}</td>
                    <td className="px-5 py-2.5">
                      <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 hidden lg:table-cell">{formatDate(u.createdAt.slice(0, 10))}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                          onClick={() => startEdit(u)}
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          onClick={() => remove(u)}
                          title="Delete"
                          disabled={u.id === currentUser?.id}
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
