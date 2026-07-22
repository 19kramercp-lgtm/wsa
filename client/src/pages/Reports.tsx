import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, PageHeader } from "../components/ui";
import { formatCurrency, fullName } from "../utils/format";
import { currentPeriod, monthBounds, periodLabel, shiftPeriod } from "../utils/period";
import type {
  AgedReceivablesResponse,
  BalanceSheetResponse,
  CashFlowResponse,
  ClosedPeriod,
  IncomeStatementResponse,
  RevenueByClientResponse,
  TrialBalanceResponse,
} from "../types";

type Tab = "trial-balance" | "income-statement" | "balance-sheet" | "cash-flow" | "aged-receivables" | "revenue-by-client";

const TABS: { id: Tab; label: string }[] = [
  { id: "trial-balance", label: "Trial Balance" },
  { id: "income-statement", label: "Income Statement" },
  { id: "balance-sheet", label: "Balance Sheet" },
  { id: "cash-flow", label: "Cash Flow" },
  { id: "aged-receivables", label: "Aged Receivables" },
  { id: "revenue-by-client", label: "Revenue by Client" },
];

export default function Reports() {
  const [tab, setTab] = useState<Tab>("trial-balance");
  const [period, setPeriod] = useState(currentPeriod());
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  function loadClosedPeriods() {
    setLoadingPeriods(true);
    api.periods
      .list()
      .then(setClosedPeriods)
      .finally(() => setLoadingPeriods(false));
  }

  useEffect(loadClosedPeriods, []);

  const { start, end } = monthBounds(period);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Trial balance, income statement, balance sheet, and cash flow — by period" />

      <PeriodBar
        period={period}
        setPeriod={setPeriod}
        closedPeriods={closedPeriods}
        loading={loadingPeriods}
        onChange={loadClosedPeriods}
      />

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-fit flex-wrap">
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

      {tab === "trial-balance" && <TrialBalanceTab asOf={end} />}
      {tab === "income-statement" && <IncomeStatementTab start={start} end={end} />}
      {tab === "balance-sheet" && <BalanceSheetTab asOf={end} />}
      {tab === "cash-flow" && <CashFlowTab start={start} end={end} />}
      {tab === "aged-receivables" && <AgedReceivablesTab asOf={end} />}
      {tab === "revenue-by-client" && <RevenueByClientTab start={start} end={end} />}
    </div>
  );
}

function PeriodBar({
  period,
  setPeriod,
  closedPeriods,
  loading,
  onChange,
}: {
  period: string;
  setPeriod: (p: string) => void;
  closedPeriods: ClosedPeriod[];
  loading: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isClosed = closedPeriods.some((cp) => cp.period === period);

  async function toggleClose() {
    setError(null);
    if (isClosed) {
      if (!confirm(`Reopen ${periodLabel(period)}? This will allow transactions in this month to be edited again.`)) {
        return;
      }
    } else if (
      !confirm(
        `Close the books for ${periodLabel(period)}? No revenue, expense, or journal entries dated in this month can be added, edited, or deleted until it is reopened.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      if (isClosed) {
        await api.periods.reopen(period);
      } else {
        await api.periods.close(period);
      }
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            aria-label="Next month"
          >
            ›
          </button>
          <Button variant="secondary" onClick={() => setPeriod(currentPeriod())}>
            This Month
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!loading && <Badge tone={isClosed ? "slate" : "green"}>{isClosed ? "Closed" : "Open"}</Badge>}
          <Button variant={isClosed ? "secondary" : "danger"} onClick={toggleClose} disabled={busy || loading}>
            {isClosed ? "Reopen Period" : "Close Period"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </Card>
  );
}

function TrialBalanceTab({ asOf }: { asOf: string }) {
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.trialBalance(asOf).then(setData).finally(() => setLoading(false));
  }, [asOf]);

  if (loading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
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
  );
}

function IncomeStatementTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.incomeStatement(start, end).then(setData).finally(() => setLoading(false));
  }, [start, end]);

  if (loading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
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
  );
}

function BalanceSheetTab({ asOf }: { asOf: string }) {
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.balanceSheet(asOf).then(setData).finally(() => setLoading(false));
  }, [asOf]);

  if (loading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
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
  );
}

function CashFlowTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<CashFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.cashFlow(start, end).then(setData).finally(() => setLoading(false));
  }, [start, end]);

  if (loading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  const section = (title: string, rows: CashFlowResponse["operatingRows"], total: number) => (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{title}</p>
      <table className="w-full text-sm mb-4">
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="py-1 text-slate-400">No activity in this period.</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.account.id} className="border-b border-slate-50 dark:border-slate-800/60">
              <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.account.name}</td>
              <td
                className={`py-1.5 text-right ${r.amount >= 0 ? "text-slate-700 dark:text-slate-200" : "text-red-600"}`}
              >
                {r.amount >= 0 ? formatCurrency(r.amount) : `(${formatCurrency(Math.abs(r.amount))})`}
              </td>
            </tr>
          ))}
          <tr className="font-medium text-slate-800 dark:text-slate-100">
            <td className="py-2">Net Cash from {title}</td>
            <td className={`py-2 text-right ${total >= 0 ? "" : "text-red-600"}`}>
              {total >= 0 ? formatCurrency(total) : `(${formatCurrency(Math.abs(total))})`}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Statement of Cash Flows</h2>
        {!data.reconciled && <Badge tone="red">Does not reconcile</Badge>}
      </div>

      {section("Operating Activities", data.operatingRows, data.totalOperating)}
      {section("Investing Activities", data.investingRows, data.totalInvesting)}
      {section("Financing Activities", data.financingRows, data.totalFinancing)}

      <div className="border-t-2 border-slate-200 dark:border-slate-700 pt-3 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Net Change in Cash</span>
          <span
            className={`font-semibold text-lg ${data.netChangeInCash >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {formatCurrency(data.netChangeInCash)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm text-slate-500">
          <span>Cash at Beginning of Period</span>
          <span>{formatCurrency(data.beginningCash)}</span>
        </div>
        <div className="flex justify-between items-center text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Cash at End of Period</span>
          <span>{formatCurrency(data.endingCash)}</span>
        </div>
      </div>
    </Card>
  );
}

function AgedReceivablesTab({ asOf }: { asOf: string }) {
  const [data, setData] = useState<AgedReceivablesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.agedReceivables(asOf).then(setData).finally(() => setLoading(false));
  }, [asOf]);

  if (loading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Aged Receivables</h2>
        <span className="text-xs text-slate-400">as of {asOf}</span>
      </div>
      {data.rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">
          No outstanding balances. Amounts owed appear here once a revenue entry is deposited to Accounts Receivable
          for a client.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-2 font-medium">Client</th>
                <th className="px-5 py-2 font-medium text-right">Current (0-30)</th>
                <th className="px-5 py-2 font-medium text-right">31-60 Days</th>
                <th className="px-5 py-2 font-medium text-right">61-90 Days</th>
                <th className="px-5 py-2 font-medium text-right">91+ Days</th>
                <th className="px-5 py-2 font-medium text-right">Total Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.rows.map((r) => (
                <tr key={r.client.id}>
                  <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{fullName(r.client)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                    {r.current !== 0 ? formatCurrency(r.current) : ""}
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                    {r.days31to60 !== 0 ? formatCurrency(r.days31to60) : ""}
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-700 dark:text-slate-200">
                    {r.days61to90 !== 0 ? formatCurrency(r.days61to90) : ""}
                  </td>
                  <td className={`px-5 py-2.5 text-right ${r.over90 > 0 ? "text-red-600 font-medium" : "text-slate-700 dark:text-slate-200"}`}>
                    {r.over90 !== 0 ? formatCurrency(r.over90) : ""}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100">
                <td className="px-5 py-2.5">Total</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(data.totals.current)}</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(data.totals.days31to60)}</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(data.totals.days61to90)}</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(data.totals.over90)}</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(data.totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}

function RevenueByClientTab({ start, end }: { start: string; end: string }) {
  const [data, setData] = useState<RevenueByClientResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.reports.revenueByClient(start, end).then(setData).finally(() => setLoading(false));
  }, [start, end]);

  if (loading || !data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Revenue by Client</h2>
        <span className="text-sm font-medium text-emerald-600">{formatCurrency(data.totalRevenue)} total</span>
      </div>
      {data.rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">No revenue recorded in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-2 font-medium">Client</th>
                <th className="px-5 py-2 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.rows.map((r) => (
                <tr key={r.client?.id ?? "unassigned"}>
                  <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">
                    {r.client ? fullName(r.client) : <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-800 dark:text-slate-100">
                    {formatCurrency(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100">
                <td className="px-5 py-2.5">Total</td>
                <td className="px-5 py-2.5 text-right">{formatCurrency(data.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
