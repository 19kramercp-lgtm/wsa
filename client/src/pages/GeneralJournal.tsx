import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { PlusIcon, TrashIcon } from "../components/Icons";
import { formatCurrency, formatDate, fullName, todayISO } from "../utils/format";
import { isDateInClosedPeriod, periodLabel } from "../utils/period";
import { useClosedPeriods } from "../utils/useClosedPeriods";
import { useClients } from "../utils/useClients";
import { useVendors } from "../utils/useVendors";
import type { Account, JournalEntry, JournalLine } from "../types";

interface DraftLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

const emptyLine = (): DraftLine => ({ accountId: "", debit: "", credit: "", description: "" });

export default function GeneralJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const closedPeriods = useClosedPeriods();
  const { clients } = useClients();
  const { vendors } = useVendors();

  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [clientId, setClientId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const vendorById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const sortedClients = useMemo(() => [...clients].sort((a, b) => fullName(a).localeCompare(fullName(b))), [clients]);
  const sortedVendors = useMemo(
    () => [...vendors].sort((a, b) => a.businessName.localeCompare(b.businessName)),
    [vendors]
  );

  function load() {
    setLoading(true);
    Promise.all([api.journal.list(), api.accounts.list()])
      .then(([je, acc]) => {
        setEntries(je);
        setAccounts(acc);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = Math.round((totalDebit - totalCredit) * 100) / 100;

  function updateLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function resetForm() {
    setDate(todayISO());
    setMemo("");
    setClientId("");
    setVendorId("");
    setLines([emptyLine(), emptyLine()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (diff !== 0) {
      setError(`Entry does not balance. Debits ${formatCurrency(totalDebit)} vs credits ${formatCurrency(totalCredit)}.`);
      return;
    }
    if (isDateInClosedPeriod(date, closedPeriods)) {
      setError(`${periodLabel(date.slice(0, 7))} is closed. Reopen it on the Reports tab to post entries here.`);
      return;
    }
    const payloadLines = lines
      .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description,
      }));
    if (payloadLines.length < 2) {
      setError("Add at least two lines with an account and an amount.");
      return;
    }
    setSaving(true);
    try {
      await api.journal.create({
        date,
        memo,
        lines: payloadLines as JournalLine[],
        source: "manual",
        clientId: clientId || null,
        vendorId: vendorId || null,
      });
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this journal entry? This cannot be undone.")) return;
    try {
      await api.journal.remove(id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div>
      <PageHeader
        title="General Journal"
        subtitle="Chronological record of every transaction, in double-entry form"
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>
            <PlusIcon width={16} height={16} /> New Journal Entry
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
              <Field label="Date">
                <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field label="Memo">
                <input
                  className={inputClass}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Description of this entry"
                />
              </Field>
              <Field label="Client (optional)" hint="Tag a client, e.g. to record a payment against their balance">
                <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">No client</option>
                  {sortedClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {fullName(c)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vendor (optional)" hint="Tag a vendor, e.g. to record a payment against what you owe them">
                <select className={inputClass} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">No vendor</option>
                  {sortedVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {isDateInClosedPeriod(date, closedPeriods) && (
              <Alert tone="warning">
                {periodLabel(date.slice(0, 7))} is closed. Reopen it on the Reports tab before posting entries here.
              </Alert>
            )}

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-1 py-2 font-medium">Account</th>
                    <th className="px-1 py-2 font-medium">Description</th>
                    <th className="px-1 py-2 font-medium w-28">Debit</th>
                    <th className="px-1 py-2 font-medium w-28">Credit</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-1 py-1.5">
                        <select
                          className={inputClass}
                          value={line.accountId}
                          onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                        >
                          <option value="">Select account…</option>
                          {accounts
                            .filter((a) => a.active)
                            .sort((a, b) => a.code.localeCompare(b.code))
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          className={inputClass}
                          value={line.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={inputClass}
                          value={line.debit}
                          onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={inputClass}
                          value={line.credit}
                          onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                        />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            className="text-slate-400 hover:text-red-600"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <TrashIcon width={15} height={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium text-slate-600 dark:text-slate-300">
                    <td className="px-1 py-2" colSpan={2}>
                      <button
                        type="button"
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => setLines((prev) => [...prev, emptyLine()])}
                      >
                        + Add line
                      </button>
                    </td>
                    <td className="px-1 py-2">{formatCurrency(totalDebit)}</td>
                    <td className="px-1 py-2">{formatCurrency(totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {diff !== 0 && (
              <p className="text-xs text-amber-600">
                Out of balance by {formatCurrency(Math.abs(diff))} — debits must equal credits.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || isDateInClosedPeriod(date, closedPeriods)}>
                Post Entry
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading journal…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No journal entries yet.</Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">#{entry.reference}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{entry.memo || "—"}</span>
                  <Badge tone={entry.source === "revenue" ? "green" : entry.source === "expense" ? "red" : "blue"}>
                    {entry.source}
                  </Badge>
                  {entry.clientId && clientById.get(entry.clientId) && (
                    <Badge tone="slate">{fullName(clientById.get(entry.clientId)!)}</Badge>
                  )}
                  {entry.vendorId && vendorById.get(entry.vendorId) && (
                    <Badge tone="slate">{vendorById.get(entry.vendorId)!.businessName}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => remove(entry.id)} title="Delete entry">
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {entry.lines.map((line) => {
                    const acc = accountById.get(line.accountId);
                    return (
                      <tr key={line.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 pl-4 text-slate-600 dark:text-slate-300">
                          {acc ? `${acc.code} — ${acc.name}` : "Unknown account"}
                        </td>
                        <td className="py-1.5 text-right w-28 text-slate-700 dark:text-slate-200">
                          {line.debit > 0 ? formatCurrency(line.debit) : ""}
                        </td>
                        <td className="py-1.5 pr-2 text-right w-28 text-slate-700 dark:text-slate-200">
                          {line.credit > 0 ? formatCurrency(line.credit) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
