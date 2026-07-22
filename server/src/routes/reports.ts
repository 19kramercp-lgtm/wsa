import { Router } from "express";
import { readDatabase } from "../db.js";
import type { Account, JournalEntry } from "../types.js";

const router = Router();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function balanceFor(account: Account, entries: JournalEntry[]): number {
  let balance = 0;
  for (const e of entries) {
    for (const line of e.lines) {
      if (line.accountId !== account.id) continue;
      balance += account.normalBalance === "debit" ? line.debit - line.credit : line.credit - line.debit;
    }
  }
  return round2(balance);
}

// Trial balance as of a given date
router.get("/trial-balance", async (req, res) => {
  const db = await readDatabase();
  const { asOf } = req.query;
  const entries = asOf ? db.journalEntries.filter((e) => e.date <= String(asOf)) : db.journalEntries;

  const rows = db.accounts
    .filter((a) => a.active || entries.some((e) => e.lines.some((l) => l.accountId === a.id)))
    .map((a) => {
      const bal = balanceFor(a, entries);
      return {
        account: a,
        debit: a.normalBalance === "debit" && bal > 0 ? bal : a.normalBalance === "credit" && bal < 0 ? -bal : 0,
        credit: a.normalBalance === "credit" && bal > 0 ? bal : a.normalBalance === "debit" && bal < 0 ? -bal : 0,
      };
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0)
    .sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totalDebit = round2(rows.reduce((sum, r) => sum + r.debit, 0));
  const totalCredit = round2(rows.reduce((sum, r) => sum + r.credit, 0));

  res.json({ asOf: asOf ?? null, rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit });
});

// Income statement (Revenue - Expenses) for a date range
router.get("/income-statement", async (req, res) => {
  const db = await readDatabase();
  const { start, end } = req.query;
  const entries = db.journalEntries
    .filter((e) => (start ? e.date >= String(start) : true))
    .filter((e) => (end ? e.date <= String(end) : true));

  const revenueAccounts = db.accounts.filter((a) => a.type === "revenue");
  const expenseAccounts = db.accounts.filter((a) => a.type === "expense");

  const revenueRows = revenueAccounts
    .map((a) => ({ account: a, amount: balanceFor(a, entries) }))
    .filter((r) => r.amount !== 0)
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
  const expenseRows = expenseAccounts
    .map((a) => ({ account: a, amount: balanceFor(a, entries) }))
    .filter((r) => r.amount !== 0)
    .sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totalRevenue = round2(revenueRows.reduce((sum, r) => sum + r.amount, 0));
  const totalExpenses = round2(expenseRows.reduce((sum, r) => sum + r.amount, 0));
  const netIncome = round2(totalRevenue - totalExpenses);

  res.json({
    start: start ?? null,
    end: end ?? null,
    revenueRows,
    expenseRows,
    totalRevenue,
    totalExpenses,
    netIncome,
  });
});

// Balance sheet as of a given date
router.get("/balance-sheet", async (req, res) => {
  const db = await readDatabase();
  const { asOf } = req.query;
  const entries = asOf ? db.journalEntries.filter((e) => e.date <= String(asOf)) : db.journalEntries;

  const assetAccounts = db.accounts.filter((a) => a.type === "asset");
  const liabilityAccounts = db.accounts.filter((a) => a.type === "liability");
  const equityAccounts = db.accounts.filter((a) => a.type === "equity");

  const toRows = (accounts: Account[]) =>
    accounts
      .map((a) => ({ account: a, amount: balanceFor(a, entries) }))
      .filter((r) => r.amount !== 0)
      .sort((a, b) => a.account.code.localeCompare(b.account.code));

  const assetRows = toRows(assetAccounts);
  const liabilityRows = toRows(liabilityAccounts);
  const equityRows = toRows(equityAccounts);

  // Net income to date rolls into equity (retained earnings) until formally closed
  const revenueAccounts = db.accounts.filter((a) => a.type === "revenue");
  const expenseAccounts = db.accounts.filter((a) => a.type === "expense");
  const totalRevenue = round2(revenueAccounts.reduce((sum, a) => sum + balanceFor(a, entries), 0));
  const totalExpenses = round2(expenseAccounts.reduce((sum, a) => sum + balanceFor(a, entries), 0));
  const netIncomeToDate = round2(totalRevenue - totalExpenses);

  const totalAssets = round2(assetRows.reduce((sum, r) => sum + r.amount, 0));
  const totalLiabilities = round2(liabilityRows.reduce((sum, r) => sum + r.amount, 0));
  const totalEquityBeforeNetIncome = round2(equityRows.reduce((sum, r) => sum + r.amount, 0));
  const totalEquity = round2(totalEquityBeforeNetIncome + netIncomeToDate);

  res.json({
    asOf: asOf ?? null,
    assetRows,
    liabilityRows,
    equityRows,
    netIncomeToDate,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: round2(totalLiabilities + totalEquity),
    balanced: totalAssets === round2(totalLiabilities + totalEquity),
  });
});

export default router;
