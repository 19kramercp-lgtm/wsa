import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Field, PageHeader, inputClass } from "../components/ui";
import { formatCurrency, formatDate } from "../utils/format";
import { currentPeriod, monthBounds } from "../utils/period";
import type { Account, LedgerResponse } from "../types";

const defaultRange = monthBounds(currentPeriod());

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [start, setStart] = useState(defaultRange.start);
  const [end, setEnd] = useState(defaultRange.end);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.accounts.list().then((acc) => {
      setAccounts(acc);
      const firstActive = acc.filter((a) => a.active).sort((a, b) => a.code.localeCompare(b.code))[0];
      if (firstActive) setAccountId(firstActive.id);
    });
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    api.ledger
      .get(accountId, { start: start || undefined, end: end || undefined })
      .then(setLedger)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [accountId, start, end]);

  return (
    <div>
      <PageHeader title="General Ledger" subtitle="Detailed transaction history and running balance for each account" />

      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Account">
            <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((a) => (
                  <option key={a.id} value={a.id} disabled={!a.active}>
                    {a.code} — {a.name} {!a.active ? "(inactive)" : ""}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="From">
            <input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading ledger…</p>
      ) : ledger ? (
        <Card>
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {ledger.account.code} — {ledger.account.name}
              </h2>
              <p className="text-xs text-slate-400 capitalize">
                {ledger.account.type} · normal balance: {ledger.account.normalBalance}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Ending Balance</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {formatCurrency(ledger.rows.at(-1)?.balance ?? 0)}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Ref</th>
                  <th className="px-5 py-2 font-medium">Memo</th>
                  <th className="px-5 py-2 font-medium text-right">Debit</th>
                  <th className="px-5 py-2 font-medium text-right">Credit</th>
                  <th className="px-5 py-2 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No transactions for this account in the selected range.
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(row.date)}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-400">#{row.reference}</td>
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">{row.memo}</td>
                      <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                        {row.debit > 0 ? formatCurrency(row.debit) : ""}
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                        {row.credit > 0 ? formatCurrency(row.credit) : ""}
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium text-slate-800 dark:text-slate-100">
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
