import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, PageHeader } from "../components/ui";
import { formatCurrency, formatDate, todayISO } from "../utils/format";
import type { Account, IncomeStatementResponse, JournalEntry } from "../types";
import { ExpenseIcon, RevenueIcon } from "../components/Icons";

function startOfYearISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ytd, setYtd] = useState<IncomeStatementResponse | null>(null);
  const [cashBalance, setCashBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.accounts.list(), api.journal.list(), api.reports.incomeStatement(startOfYearISO(), todayISO())])
      .then(async ([acc, je, ytdRes]) => {
        setAccounts(acc);
        setEntries(je);
        setYtd(ytdRes);
        const cashAccounts = acc.filter((a) => a.type === "asset" && /cash/i.test(a.name));
        const ledgers = await Promise.all(cashAccounts.map((a) => api.ledger.get(a.id)));
        const total = ledgers.reduce((sum, l) => sum + (l.rows.at(-1)?.balance ?? 0), 0);
        setCashBalance(total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const recent = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Wingspan Aviation — financial overview"
        actions={
          <>
            <Link to="/revenues">
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm">
                <RevenueIcon width={16} height={16} /> Add Revenue
              </button>
            </Link>
            <Link to="/expenses">
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 shadow-sm">
                <ExpenseIcon width={16} height={16} /> Add Expense
              </button>
            </Link>
          </>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue (YTD)" value={formatCurrency(ytd?.totalRevenue ?? 0)} tone="emerald" />
        <StatCard label="Expenses (YTD)" value={formatCurrency(ytd?.totalExpenses ?? 0)} tone="red" />
        <StatCard label="Net Income (YTD)" value={formatCurrency(ytd?.netIncome ?? 0)} tone="blue" />
        <StatCard label="Cash on Hand" value={formatCurrency(cashBalance)} tone="slate" />
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Recent Activity</h2>
          <Link to="/general-journal" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            No transactions yet. Add a revenue or expense entry to get started.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((e) => {
              const total = e.lines.reduce((sum, l) => sum + l.debit, 0);
              const primaryLine = e.lines.find((l) => l.credit > 0 && accountById.get(l.accountId)?.type === "revenue")
                ? e.lines.find((l) => accountById.get(l.accountId)?.type === "revenue")
                : e.lines.find((l) => accountById.get(l.accountId)?.type === "expense");
              const account = primaryLine ? accountById.get(primaryLine.accountId) : undefined;
              const isRevenue = account?.type === "revenue";
              return (
                <li key={e.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{e.memo}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(e.date)} · {account?.name ?? "Manual entry"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      isRevenue ? "text-emerald-600" : e.source === "expense" ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    {isRevenue ? "+" : e.source === "expense" ? "-" : ""}
                    {formatCurrency(total)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "emerald" | "red" | "blue" | "slate";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-brand-600 dark:text-brand-400",
    slate: "text-slate-700 dark:text-slate-200",
  };
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}
