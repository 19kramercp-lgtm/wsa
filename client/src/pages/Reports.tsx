import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Badge, Card, Field, PageHeader, inputClass } from "../components/ui";
import { formatCurrency, todayISO } from "../utils/format";
import type { BalanceSheetResponse, IncomeStatementResponse, TrialBalanceResponse } from "../types";

type Tab = "trial-balance" | "income-statement" | "balance-sheet";

const TABS: { id: Tab; label: string }[] = [
  { id: "trial-balance", label: "Trial Balance" },
  { id: "income-statement", label: "Income Statement" },
  { id: "balance-sheet", label: "Balance Sheet" },
];

function startOfYearISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>("trial-balance");

  return (
    <div>
      <PageHeader title="Reports" subtitle="Trial balance, income statement, and balance sheet" />

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trial-balance" && <TrialBalanceTab />}
      {tab === "income-statement" && <IncomeStatementTab />}
      {tab === "balance-sheet" && <BalanceSheetTab />}
    </div>
  );
}

function TrialBalanceTab() {
  const [asOf, setAsOf] = useState(todayISO());
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.trialBalance(asOf).then(setData).finally(() => setLoading(false));
  }, [asOf]);

  return (
    <div>
      <Card className="p-5 mb-6">
        <Field label="As of">
          <input type="date" className={`${inputClass} max-w-xs`} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </Card>

      {loading || !data ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card>
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Trial Balance</h2>
            <Badge tone={data.balanced ? "green" : "red"}>{data.balanced ? "Balanced" : "Out of balance"}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Code</th>
                  <th className="px-5 py-2 font-medium">Account</th>
                  <th className="px-5 py-2 font-medium text-right">Debit</th>
                  <th className="px-5 py-2 font-medium text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.rows.map((r) => (
                  <tr key={r.account.id}>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-400">{r.account.code}</td>
                    <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">{r.account.name}</td>
                    <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                      {r.debit > 0 ? formatCurrency(r.debit) : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                      {r.credit > 0 ? formatCurrency(r.credit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100">
                  <td className="px-5 py-2.5" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-right">{formatCurrency(data.totalDebit)}</td>
                  <td className="px-5 py-2.5 text-right">{formatCurrency(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function IncomeStatementTab() {
  const [start, setStart] = useState(startOfYearISO());
  const [end, setEnd] = useState(todayISO());
  const [data, setData] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.incomeStatement(start, end).then(setData).finally(() => setLoading(false));
  }, [start, end]);

  return (
    <div>
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <Field label="From">
            <input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      </Card>

      {loading || !data ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Income Statement</h2>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Revenue</p>
          <table className="w-full text-sm mb-4">
            <tbody>
              {data.revenueRows.length === 0 && (
                <tr>
                  <td className="py-1 text-slate-400">No revenue in this period.</td>
                </tr>
              )}
              {data.revenueRows.map((r) => (
                <tr key={r.account.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.account.name}</td>
                  <td className="py-1.5 text-right text-slate-700 dark:text-slate-200">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              <tr className="font-medium text-slate-800 dark:text-slate-100">
                <td className="py-2">Total Revenue</td>
                <td className="py-2 text-right">{formatCurrency(data.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Expenses</p>
          <table className="w-full text-sm mb-4">
            <tbody>
              {data.expenseRows.length === 0 && (
                <tr>
                  <td className="py-1 text-slate-400">No expenses in this period.</td>
                </tr>
              )}
              {data.expenseRows.map((r) => (
                <tr key={r.account.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.account.name}</td>
                  <td className="py-1.5 text-right text-slate-700 dark:text-slate-200">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              <tr className="font-medium text-slate-800 dark:text-slate-100">
                <td className="py-2">Total Expenses</td>
                <td className="py-2 text-right">{formatCurrency(data.totalExpenses)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between items-center border-t-2 border-slate-200 dark:border-slate-700 pt-3">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Net Income</span>
            <span className={`font-semibold text-lg ${data.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(data.netIncome)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

function BalanceSheetTab() {
  const [asOf, setAsOf] = useState(todayISO());
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.balanceSheet(asOf).then(setData).finally(() => setLoading(false));
  }, [asOf]);

  return (
    <div>
      <Card className="p-5 mb-6">
        <Field label="As of">
          <input type="date" className={`${inputClass} max-w-xs`} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </Card>

      {loading || !data ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Assets</h2>
            <table className="w-full text-sm">
              <tbody>
                {data.assetRows.map((r) => (
                  <tr key={r.account.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.account.name}</td>
                    <td className="py-1.5 text-right text-slate-700 dark:text-slate-200">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-slate-800 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="py-2">Total Assets</td>
                  <td className="py-2 text-right">{formatCurrency(data.totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Liabilities & Equity</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Liabilities</p>
            <table className="w-full text-sm mb-3">
              <tbody>
                {data.liabilityRows.length === 0 && (
                  <tr>
                    <td className="py-1 text-slate-400">No liabilities.</td>
                  </tr>
                )}
                {data.liabilityRows.map((r) => (
                  <tr key={r.account.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.account.name}</td>
                    <td className="py-1.5 text-right text-slate-700 dark:text-slate-200">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                <tr className="font-medium text-slate-800 dark:text-slate-100">
                  <td className="py-2">Total Liabilities</td>
                  <td className="py-2 text-right">{formatCurrency(data.totalLiabilities)}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Equity</p>
            <table className="w-full text-sm">
              <tbody>
                {data.equityRows.map((r) => (
                  <tr key={r.account.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.account.name}</td>
                    <td className="py-1.5 text-right text-slate-700 dark:text-slate-200">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
                <tr className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-1.5 text-slate-600 dark:text-slate-300">Net Income (current)</td>
                  <td className="py-1.5 text-right text-slate-700 dark:text-slate-200">
                    {formatCurrency(data.netIncomeToDate)}
                  </td>
                </tr>
                <tr className="font-medium text-slate-800 dark:text-slate-100">
                  <td className="py-2">Total Equity</td>
                  <td className="py-2 text-right">{formatCurrency(data.totalEquity)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-center border-t-2 border-slate-200 dark:border-slate-700 pt-3 mt-2">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Total Liabilities & Equity</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {formatCurrency(data.totalLiabilitiesAndEquity)}
              </span>
            </div>
            {!data.balanced && (
              <p className="mt-2 text-xs text-red-600">
                Warning: assets do not equal liabilities + equity. Check the trial balance.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
