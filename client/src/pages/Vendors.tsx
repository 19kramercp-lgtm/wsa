import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { clientAddress, formatDate, formatPhoneNumber } from "../utils/format";
import type { Vendor } from "../types";

interface VendorFormState {
  id?: string;
  businessName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const emptyVendorForm: VendorFormState = {
  businessName: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip: "",
};

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VendorFormState>(emptyVendorForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.vendors
      .list()
      .then(setVendors)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = { ...form, phone: formatPhoneNumber(form.phone) };
      if (form.id) {
        await api.vendors.update(form.id, payload);
      } else {
        await api.vendors.create(payload);
      }
      setForm(emptyVendorForm);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(v: Vendor) {
    setForm({
      id: v.id,
      businessName: v.businessName,
      phone: v.phone,
      email: v.email,
      street: v.street,
      city: v.city,
      state: v.state,
      zip: v.zip,
    });
    setShowForm(true);
  }

  async function remove(v: Vendor) {
    if (!confirm(`Delete vendor ${v.businessName}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.vendors.remove(v.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...vendors].sort((a, b) => a.businessName.localeCompare(b.businessName));

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Businesses used as payees on expense entries"
        actions={
          <Button
            onClick={() => {
              setForm(emptyVendorForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> Add Vendor
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Business Name">
                  <input
                    className={inputClass}
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="e.g. Shell Aviation"
                    required
                  />
                </Field>
              </div>
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
                  placeholder="e.g. billing@example.com"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Street Address">
                <input
                  className={inputClass}
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  placeholder="e.g. 123 Main St"
                />
              </Field>
              <Field label="City">
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Anytown"
                />
              </Field>
              <Field label="State">
                <input
                  className={inputClass}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. CA"
                />
              </Field>
              <Field label="Zip Code">
                <input
                  className={inputClass}
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  placeholder="e.g. 90210"
                />
              </Field>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Create Vendor"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyVendorForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading vendors…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No vendors yet. Add one to get started.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Business Name</th>
                  <th className="px-5 py-2 font-medium">Phone</th>
                  <th className="px-5 py-2 font-medium">Email</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Address</th>
                  <th className="px-5 py-2 font-medium hidden lg:table-cell">Added</th>
                  <th className="px-5 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((v) => (
                  <tr key={v.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{v.businessName}</td>
                    <td className="px-5 py-2.5 text-slate-500">{v.phone || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{v.email || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{clientAddress(v) || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden lg:table-cell">{formatDate(v.createdAt.slice(0, 10))}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                          onClick={() => startEdit(v)}
                          title="Edit"
                        >
                          <EditIcon width={16} height={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          onClick={() => remove(v)}
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
