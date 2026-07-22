import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { formatCurrency, formatDate, fullName, todayISO } from "../utils/format";
import { useClients } from "../utils/useClients";
import { useVendors } from "../utils/useVendors";
import type { Account, RecurringFrequency, RecurringTransaction, RecurringType } from "../types";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

interface FormState {
  id?: string;
  type: RecurringType;
  description: string;
  amount: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
  revenueAccountId: string;
  depositAccountId: string;
  clientId: string;
  expenseAccountId: string;
  paymentAccountId: string;
  vendorId: string;
}

const emptyForm: FormState = {
  type: "expense",
  description: "",
  amount: "",
  frequency: "monthly",
  startDate: todayISO(),
  endDate: "",
  revenueAccountId: "",
  depositAccountId: "",
  clientId: "",
  expenseAccountId: "",
  paymentAccountId: "",
  vendorId: "",
};

export default function Recurring() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const { clients } = useClients();
  const { vendors } = useVendors();

  function load() {
    setLoading(true);
    Promise.all([api.recurring.list(), api.accounts.list()])
      .then(([r, acc]) => {
        setRecurring(r);
        setAccounts(acc);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const revenueAccounts = useMemo(
    () => accounts.filter((a) => a.type === "revenue" && a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const depositAccounts = useMemo(
    () => accounts.filter((a) => a.type === "asset" && a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const expenseAccounts = useMemo(
    () => accounts.filter((a) => a.type === "expense" && a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const paymentAccounts = useMemo(
    () =>
      accounts
        .filter((a) => (a.type === "asset" || a.type === "liability") && a.active)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vendorById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const sortedClients = useMemo(() => [...clients].sort((a, b) => fullName(a).localeCompare(fullName(b))), [clients]);
  const sortedVendors = useMemo(
    () => [...vendors].sort((a, b) => a.businessName.localeCompare(b.businessName)),
    [vendors]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        description: form.description,
        amount: amt,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate || null,
        revenueAccountId: form.revenueAccountId || undefined,
        depositAccountId: form.depositAccountId || undefined,
        clientId: form.clientId || undefined,
        expenseAccountId: form.expenseAccountId || undefined,
        paymentAccountId: form.paymentAccountId || undefined,
        vendorId: form.vendorId || undefined,
      };
      if (form.id) {
        await api.recurring.update(form.id, payload);
      } else {
        await api.recurring.create(payload);
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

  function startEdit(r: RecurringTransaction) {
    setForm({
      id: r.id,
      type: r.type,
      description: r.description,
      amount: String(r.amount),
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate ?? "",
      revenueAccountId: r.revenueAccountId ?? "",
      depositAccountId: r.depositAccountId ?? "",
      clientId: r.clientId ?? "",
      expenseAccountId: r.expenseAccountId ?? "",
      paymentAccountId: r.paymentAccountId ?? "",
      vendorId: r.vendorId ?? "",
    });
    setShowForm(true);
  }

  async function toggleActive(r: RecurringTransaction) {
    setError(null);
    try {
      await api.recurring.update(r.id, { active: !r.active });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(r: RecurringTransaction) {
    if (!confirm(`Delete the recurring "${r.description}"? Entries already posted from it will stay on the books.`)) return;
    setError(null);
    try {
      await api.recurring.remove(r.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...recurring].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));

  return (
    <div>
      <PageHeader
        title="Recurring Transactions"
        subtitle="Automate revenue and expenses that repeat on a schedule, like rent or insurance"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> New Recurring Transaction
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
            <Field label="Type">
              <select
                className={inputClass}
                value={form.type}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, type: e.target.value as RecurringType })}
              >
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
            <Field label="Description">
              <input
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Hangar rent"
                required
              />
            </Field>
            <Field label="Amount">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Frequency">
              <select
                className={inputClass}
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
            <Field label="Start Date" hint={form.id ? "Can't be changed after creation" : undefined}>
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </Field>
            <Field label="End Date (optional)">
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>

            {form.type === "revenue" ? (
              <>
                <Field label="Revenue Account">
                  <select
                    className={inputClass}
                    value={form.revenueAccountId}
                    onChange={(e) => setForm({ ...form, revenueAccountId: e.target.value })}
                    required
                  >
                    <option value="">Select account…</option>
                    {revenueAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Deposited To">
                  <select
                    className={inputClass}
                    value={form.depositAccountId}
                    onChange={(e) => setForm({ ...form, depositAccountId: e.target.value })}
                    required
                  >
                    <option value="">Select account…</option>
                    {depositAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Payer">
                  <select
                    className={inputClass}
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    required
                  >
                    <option value="">Select client…</option>
                    {sortedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {fullName(c)}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Expense Account">
                  <select
                    className={inputClass}
                    value={form.expenseAccountId}
                    onChange={(e) => setForm({ ...form, expenseAccountId: e.target.value })}
                    required
                  >
                    <option value="">Select account…</option>
                    {expenseAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Paid From">
                  <select
                    className={inputClass}
                    value={form.paymentAccountId}
                    onChange={(e) => setForm({ ...form, paymentAccountId: e.target.value })}
                    required
                  >
                    <option value="">Select account…</option>
                    {paymentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Payee">
                  <select
                    className={inputClass}
                    value={form.vendorId}
                    onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                    required
                  >
                    <option value="">Select vendor…</option>
                    {sortedVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.businessName}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Create Recurring Transaction"}
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
        <p className="text-sm text-slate-500">Loading…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          No recurring transactions yet. Add one for things like rent or insurance that repeat on a schedule.
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[820px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium w-24">Type</th>
                  <th className="px-5 py-2 font-medium w-32">Party</th>
                  <th className="px-5 py-2 font-medium w-28 text-right">Amount</th>
                  <th className="px-5 py-2 font-medium w-28">Frequency</th>
                  <th className="px-5 py-2 font-medium w-32">Next Run</th>
                  <th className="px-5 py-2 font-medium w-24">Status</th>
                  <th className="px-5 py-2 font-medium text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((r) => {
                  const partyName =
                    r.type === "revenue"
                      ? r.clientId && clientById.get(r.clientId)
                        ? fullName(clientById.get(r.clientId)!)
                        : "—"
                      : r.vendorId && vendorById.get(r.vendorId)
                        ? vendorById.get(r.vendorId)!.businessName
                        : "—";
                  const accountName =
                    r.type === "revenue"
                      ? accountById.get(r.revenueAccountId ?? "")?.name
                      : accountById.get(r.expenseAccountId ?? "")?.name;
                  return (
                    <tr key={r.id} className={!r.active ? "opacity-50" : ""}>
                      <td className="px-5 py-2.5 text-slate-800 dark:text-slate-100">
                        <p className="font-medium">{r.description}</p>
                        <p className="text-xs text-slate-400">{accountName}</p>
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge tone={r.type === "revenue" ? "green" : "red"}>{r.type}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">{partyName}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">{FREQUENCY_LABELS[r.frequency]}</td>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(r.nextRunDate)}</td>
                      <td className="px-5 py-2.5">
                        <Badge tone={r.active ? "green" : "slate"}>{r.active ? "Active" : "Paused"}</Badge>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                            onClick={() => startEdit(r)}
                            title="Edit"
                          >
                            <EditIcon width={16} height={16} />
                          </button>
                          <button
                            className="px-2 py-1 rounded-md text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => toggleActive(r)}
                          >
                            {r.active ? "Pause" : "Resume"}
                          </button>
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                            onClick={() => remove(r)}
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
