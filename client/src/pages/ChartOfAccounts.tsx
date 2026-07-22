import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { formatDate } from "../utils/format";
import type { Account, AccountType, CashFlowCategory, Client, NormalBalance } from "../types";

const TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];
const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};
const DEFAULT_NORMAL: Record<AccountType, NormalBalance> = {
  asset: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
  expense: "debit",
};
const CASH_FLOW_LABELS: Record<CashFlowCategory, string> = {
  operating: "Operating",
  investing: "Investing",
  financing: "Financing",
};
const DEFAULT_CASH_FLOW: Record<AccountType, CashFlowCategory> = {
  asset: "operating",
  liability: "operating",
  equity: "financing",
  revenue: "operating",
  expense: "operating",
};

type Tab = "accounts" | "clients";

export default function ChartOfAccounts() {
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Accounts and clients used to categorize Wingspan Aviation's finances"
      />

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-fit">
        <button
          onClick={() => setTab("accounts")}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab === "accounts"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Accounts
        </button>
        <button
          onClick={() => setTab("clients")}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            tab === "clients"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Clients
        </button>
      </div>

      {tab === "accounts" ? <AccountsTab /> : <ClientsTab />}
    </div>
  );
}

interface FormState {
  id?: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  description: string;
  cashFlowCategory: CashFlowCategory;
}

const emptyForm: FormState = {
  code: "",
  name: "",
  type: "asset",
  normalBalance: "debit",
  description: "",
  cashFlowCategory: "operating",
};

function AccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showInactive, setShowInactive] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.accounts
      .list()
      .then(setAccounts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const grouped = useMemo(() => {
    const map = new Map<AccountType, Account[]>();
    for (const type of TYPE_ORDER) map.set(type, []);
    for (const a of accounts) {
      if (!showInactive && !a.active) continue;
      map.get(a.type)?.push(a);
    }
    return map;
  }, [accounts, showInactive]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (form.id) {
        await api.accounts.update(form.id, {
          code: form.code,
          name: form.name,
          description: form.description,
          cashFlowCategory: form.cashFlowCategory,
        });
      } else {
        await api.accounts.create(form);
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

  function startEdit(a: Account) {
    setForm({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      normalBalance: a.normalBalance,
      description: a.description,
      cashFlowCategory: a.cashFlowCategory,
    });
    setShowForm(true);
  }

  async function toggleActive(a: Account) {
    setError(null);
    try {
      await api.accounts.update(a.id, { active: !a.active });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(a: Account) {
    if (!confirm(`Delete account ${a.code} — ${a.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.accounts.remove(a.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button
          onClick={() => {
            setForm(emptyForm);
            setShowForm((s) => !s);
          }}
        >
          <PlusIcon width={16} height={16} /> Add Account
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Code">
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 4040"
                required
              />
            </Field>
            <Field label="Account Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Discovery Flight Revenue"
                required
              />
            </Field>
            <Field label="Account Type">
              <select
                className={inputClass}
                value={form.type}
                disabled={!!form.id}
                onChange={(e) => {
                  const type = e.target.value as AccountType;
                  setForm({ ...form, type, normalBalance: DEFAULT_NORMAL[type], cashFlowCategory: DEFAULT_CASH_FLOW[type] });
                }}
              >
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Normal Balance">
              <select
                className={inputClass}
                value={form.normalBalance}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, normalBalance: e.target.value as NormalBalance })}
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </Field>
            {form.type !== "revenue" && form.type !== "expense" && (
              <Field label="Cash Flow Category" hint="Used on the Statement of Cash Flows">
                <select
                  className={inputClass}
                  value={form.cashFlowCategory}
                  onChange={(e) => setForm({ ...form, cashFlowCategory: e.target.value as CashFlowCategory })}
                >
                  <option value="operating">Operating</option>
                  <option value="investing">Investing</option>
                  <option value="financing">Financing</option>
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Description">
                <input
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes about this account"
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

      <div className="flex justify-end mb-3">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive accounts
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading accounts…</p>
      ) : (
        <div className="space-y-6">
          {TYPE_ORDER.map((type) => {
            const list = grouped.get(type) ?? [];
            if (list.length === 0) return null;
            return (
              <Card key={type}>
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">{TYPE_LABELS[type]}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-5 py-2 font-medium">Code</th>
                        <th className="px-5 py-2 font-medium">Name</th>
                        <th className="px-5 py-2 font-medium hidden md:table-cell">Description</th>
                        <th className="px-5 py-2 font-medium">Normal Bal.</th>
                        <th className="px-5 py-2 font-medium hidden lg:table-cell">Cash Flow</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                        <th className="px-5 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {list
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map((a) => (
                          <tr key={a.id} className={!a.active ? "opacity-50" : ""}>
                            <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{a.code}</td>
                            <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{a.name}</td>
                            <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{a.description}</td>
                            <td className="px-5 py-2.5 capitalize text-slate-500">{a.normalBalance}</td>
                            <td className="px-5 py-2.5 hidden lg:table-cell text-slate-500">
                              {CASH_FLOW_LABELS[a.cashFlowCategory]}
                            </td>
                            <td className="px-5 py-2.5">
                              <Badge tone={a.active ? "green" : "slate"}>{a.active ? "Active" : "Inactive"}</Badge>
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
                                  className="px-2 py-1 rounded-md text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  onClick={() => toggleActive(a)}
                                >
                                  {a.active ? "Deactivate" : "Activate"}
                                </button>
                                {!a.isSystem && (
                                  <button
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                                    onClick={() => remove(a)}
                                    title="Delete"
                                  >
                                    <TrashIcon width={16} height={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ClientFormState {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

const emptyClientForm: ClientFormState = { name: "", phone: "", email: "", address: "" };

function ClientsTab() {
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
      <div className="flex justify-end mb-3">
        <Button
          onClick={() => {
            setForm(emptyClientForm);
            setShowForm((s) => !s);
          }}
        >
          <PlusIcon width={16} height={16} /> Add Client
        </Button>
      </div>

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
