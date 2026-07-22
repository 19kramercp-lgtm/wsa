import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { formatCurrency, formatDate, todayISO } from "../utils/format";
import { isDateInClosedPeriod, periodLabel } from "../utils/period";
import { useClosedPeriods } from "../utils/useClosedPeriods";
import { useClients } from "../utils/useClients";
import type { Account, JournalEntry } from "../types";

export default function Revenues() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const closedPeriods = useClosedPeriods();
  const { clients, loading: clientsLoading } = useClients();

  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [revenueAccountId, setRevenueAccountId] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [amount, setAmount] = useState("");

  const revenueAccounts = useMemo(
    () => accounts.filter((a) => a.type === "revenue" && a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const depositAccounts = useMemo(
    () => accounts.filter((a) => a.type === "asset" && a.active).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]
  );
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients]);

  function load() {
    setLoading(true);
    Promise.all([api.accounts.list(), api.journal.list({ source: "revenue" })])
      .then(([acc, je]) => {
        setAccounts(acc);
        setEntries(je);
        setRevenueAccountId((prev) => prev || acc.find((a) => a.type === "revenue")?.id || "");
        setDepositAccountId((prev) => prev || acc.find((a) => a.type === "asset" && /cash/i.test(a.name))?.id || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const dateIsClosed = isDateInClosedPeriod(date, closedPeriods);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!clientId) {
      setError("Select a payer.");
      return;
    }
    if (dateIsClosed) {
      setError(`${periodLabel(date.slice(0, 7))} is closed. Reopen it on the Reports tab to add entries here.`);
      return;
    }
    setSaving(true);
    try {
      await api.transactions.revenue({
        date,
        description,
        clientId,
        revenueAccountId,
        depositAccountId,
        amount: amt,
      });
      setSuccess(`Recorded ${formatCurrency(amt)} of revenue.`);
      setDescription("");
      setClientId("");
      setAmount("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );
  const total = entries.reduce((sum, e) => sum + e.lines.reduce((s, l) => s + l.credit, 0), 0);

  return (
    <div>
      <PageHeader title="Revenues" subtitle="Record income from flight instruction, rentals, and other services" />

      <Card className="p-5 mb-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Amount">
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
          <Field label="Revenue Account">
            <select className={inputClass} value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)} required>
              <option value="">Select account…</option>
              {revenueAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deposited To">
            <select className={inputClass} value={depositAccountId} onChange={(e) => setDepositAccountId(e.target.value)} required>
              <option value="">Select account…</option>
              {depositAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payer">
            <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select client…</option>
              {sortedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!clientsLoading && clients.length === 0 && (
              <span className="mt-1 block text-xs text-slate-400">
                No clients yet.{" "}
                <Link to="/chart-of-accounts" className="text-brand-600 hover:underline">
                  Add one in Chart of Accounts
                </Link>
                .
              </span>
            )}
          </Field>
          <Field label="Description (optional)">
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 2 hrs dual instruction — Cessna 172"
            />
          </Field>

          {dateIsClosed && !error && (
            <div className="sm:col-span-2">
              <Alert tone="warning">
                {periodLabel(date.slice(0, 7))} is closed. Reopen it on the Reports tab before recording entries here.
              </Alert>
            </div>
          )}
          {error && (
            <div className="sm:col-span-2">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          {success && (
            <div className="sm:col-span-2">
              <Alert tone="success">{success}</Alert>
            </div>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" variant="success" disabled={saving || dateIsClosed}>
              Record Revenue
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Revenue History</h2>
          <span className="text-sm font-medium text-emerald-600">{formatCurrency(total)} total</span>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No revenue recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium">Payer</th>
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 font-medium">Deposited To</th>
                  <th className="px-5 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((e) => {
                  const revLine = e.lines.find((l) => accountById.get(l.accountId)?.type === "revenue");
                  const depLine = e.lines.find((l) => l.accountId !== revLine?.accountId);
                  return (
                    <tr key={e.id}>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(e.date)}</td>
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">{e.memo}</td>
                      <td className="px-5 py-2.5 text-slate-500">{e.clientId ? clientById.get(e.clientId)?.name ?? "—" : "—"}</td>
                      <td className="px-5 py-2.5 text-slate-500">{accountById.get(revLine?.accountId ?? "")?.name}</td>
                      <td className="px-5 py-2.5 text-slate-500">{accountById.get(depLine?.accountId ?? "")?.name}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-emerald-600">
                        {formatCurrency(revLine?.credit ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
