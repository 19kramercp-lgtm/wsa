import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { formatDate, formatPhoneNumber, fullName } from "../utils/format";
import type { Instructor } from "../types";

interface InstructorFormState {
  id?: string;
  firstName: string;
  lastName: string;
  certificateNumber: string;
  ratings: string;
  certificateExpiration: string;
  phone: string;
  email: string;
}

const emptyForm: InstructorFormState = {
  firstName: "",
  lastName: "",
  certificateNumber: "",
  ratings: "",
  certificateExpiration: "",
  phone: "",
  email: "",
};

export default function Instructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InstructorFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.instructors
      .list()
      .then(setInstructors)
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
        ...form,
        phone: formatPhoneNumber(form.phone),
        certificateExpiration: form.certificateExpiration || null,
      };
      if (form.id) {
        await api.instructors.update(form.id, payload);
      } else {
        await api.instructors.create(payload);
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

  function startEdit(i: Instructor) {
    setForm({
      id: i.id,
      firstName: i.firstName,
      lastName: i.lastName,
      certificateNumber: i.certificateNumber,
      ratings: i.ratings,
      certificateExpiration: i.certificateExpiration ?? "",
      phone: i.phone,
      email: i.email,
    });
    setShowForm(true);
  }

  async function remove(i: Instructor) {
    if (!confirm(`Delete instructor ${fullName(i)}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.instructors.remove(i.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...instructors].sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div>
      <PageHeader
        title="Instructors"
        subtitle="CFIs who log flight training and sign endorsements"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> Add Instructor
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
            <Field label="First Name">
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </Field>
            <Field label="Last Name">
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </Field>
            <Field label="CFI Certificate Number">
              <input
                className={inputClass}
                value={form.certificateNumber}
                onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
                placeholder="e.g. 1234567"
              />
            </Field>
            <Field label="Certificate Expiration">
              <input
                type="date"
                className={inputClass}
                value={form.certificateExpiration}
                onChange={(e) => setForm({ ...form, certificateExpiration: e.target.value })}
              />
            </Field>
            <Field label="Ratings">
              <input
                className={inputClass}
                value={form.ratings}
                onChange={(e) => setForm({ ...form, ratings: e.target.value })}
                placeholder="e.g. CFI, CFII, MEI"
              />
            </Field>
            <Field label="Phone Number">
              <input
                type="tel"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={(e) => setForm((f) => ({ ...f, phone: formatPhoneNumber(e.target.value) }))}
                placeholder="+1 (234) 567-8900"
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

            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Create Instructor"}
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
        <p className="text-sm text-slate-500">Loading instructors…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No instructors yet. Add one to get started.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Certificate #</th>
                  <th className="px-5 py-2 font-medium">Ratings</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Expires</th>
                  <th className="px-5 py-2 font-medium hidden lg:table-cell">Phone</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{fullName(i)}</td>
                    <td className="px-5 py-2.5 text-slate-500">{i.certificateNumber || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{i.ratings || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">
                      {i.certificateExpiration ? formatDate(i.certificateExpiration) : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 hidden lg:table-cell">{i.phone || "—"}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                          onClick={() => startEdit(i)}
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          onClick={() => remove(i)}
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
