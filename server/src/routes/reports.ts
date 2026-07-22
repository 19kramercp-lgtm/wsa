import { Router } from "express";
import { readDatabase } from "../db.js";
import type { Account, JournalEntry } from "../types.js";

function isReceivableAccount(account: Account): boolean {
  return account.type === "asset" && /receivable/i.test(account.name);
}

function isPayableAccount(account: Account): boolean {
  return account.type === "liability" && /payable/i.test(account.name);
}

function daysBetween(earlier: string, later: string): number {
  const [ay, am, ad] = earlier.split("-").map(Number);
  const [by, bm, bd] = later.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}

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

function isCashAccount(account: Account): boolean {
  return account.type === "asset" && /cash/i.test(account.name);
}

function addDays(dateISO: string, delta: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
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

// Statement of cash flows for a date range, categorized by the counterparty
// account's cash-flow category (operating / investing / financing).
router.get("/cash-flow", async (req, res) => {
  const db = await readDatabase();
  const { start, end } = req.query;
  const startStr = start ? String(start) : null;
  const endStr = end ? String(end) : null;

  const cashAccountIds = new Set(db.accounts.filter(isCashAccount).map((a) => a.id));

  const entries = db.journalEntries
    .filter((e) => (startStr ? e.date >= startStr : true))
    .filter((e) => (endStr ? e.date <= endStr : true));

  const totalsByAccount = new Map<string, number>();

  for (const entry of entries) {
    const cashLines = entry.lines.filter((l) => cashAccountIds.has(l.accountId));
    const nonCashLines = entry.lines.filter((l) => !cashAccountIds.has(l.accountId));
    if (cashLines.length === 0 || nonCashLines.length === 0) continue;
    for (const line of nonCashLines) {
      const contribution = round2(line.credit - line.debit);
      totalsByAccount.set(line.accountId, round2((totalsByAccount.get(line.accountId) ?? 0) + contribution));
    }
  }

  const rowsFor = (category: Account["cashFlowCategory"]) =>
    db.accounts
      .filter((a) => a.cashFlowCategory === category && !isCashAccount(a))
      .map((a) => ({ account: a, amount: totalsByAccount.get(a.id) ?? 0 }))
      .filter((r) => r.amount !== 0)
      .sort((a, b) => a.account.code.localeCompare(b.account.code));

  const operatingRows = rowsFor("operating");
  const investingRows = rowsFor("investing");
  const financingRows = rowsFor("financing");

  const totalOperating = round2(operatingRows.reduce((sum, r) => sum + r.amount, 0));
  const totalInvesting = round2(investingRows.reduce((sum, r) => sum + r.amount, 0));
  const totalFinancing = round2(financingRows.reduce((sum, r) => sum + r.amount, 0));
  const netChangeInCash = round2(totalOperating + totalInvesting + totalFinancing);

  const cashAccounts = db.accounts.filter(isCashAccount);
  const beginningEntries = startStr
    ? db.journalEntries.filter((e) => e.date <= addDays(startStr, -1))
    : [];
  const endingEntries = endStr ? db.journalEntries.filter((e) => e.date <= endStr) : db.journalEntries;
  const beginningCash = round2(cashAccounts.reduce((sum, a) => sum + balanceFor(a, beginningEntries), 0));
  const endingCash = round2(cashAccounts.reduce((sum, a) => sum + balanceFor(a, endingEntries), 0));

  res.json({
    start: startStr,
    end: endStr,
    operatingRows,
    investingRows,
    financingRows,
    totalOperating,
    totalInvesting,
    totalFinancing,
    netChangeInCash,
    beginningCash,
    endingCash,
    reconciled: round2(beginningCash + netChangeInCash) === endingCash,
  });
});

// Aged receivables: how much each client currently owes, bucketed by how
// long each unpaid charge has been outstanding. Charges are journal entries
// that debit an Accounts Receivable-type account and are tagged with a
// client; payments (credits to that account) are applied FIFO against the
// client's oldest outstanding charges first.
router.get("/aged-receivables", async (req, res) => {
  const db = await readDatabase();
  const { asOf } = req.query;
  const asOfStr = asOf ? String(asOf) : new Date().toISOString().slice(0, 10);

  const arAccountIds = new Set(db.accounts.filter(isReceivableAccount).map((a) => a.id));

  const entries = db.journalEntries
    .filter((e) => e.date <= asOfStr && e.clientId && e.lines.some((l) => arAccountIds.has(l.accountId)))
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));

  interface Charge {
    date: string;
    remaining: number;
  }

  const chargesByClient = new Map<string, Charge[]>();

  for (const entry of entries) {
    const arDelta = round2(
      entry.lines.reduce((sum, l) => (arAccountIds.has(l.accountId) ? sum + l.debit - l.credit : sum), 0)
    );
    if (arDelta === 0) continue;
    const clientId = entry.clientId as string;
    const charges = chargesByClient.get(clientId) ?? [];
    chargesByClient.set(clientId, charges);

    if (arDelta > 0) {
      charges.push({ date: entry.date, remaining: arDelta });
    } else {
      let paymentRemaining = -arDelta;
      for (const charge of charges) {
        if (paymentRemaining <= 0) break;
        if (charge.remaining <= 0) continue;
        const applied = Math.min(charge.remaining, paymentRemaining);
        charge.remaining = round2(charge.remaining - applied);
        paymentRemaining = round2(paymentRemaining - applied);
      }
      if (paymentRemaining > 0) {
        // Payment exceeds all known charges (credit balance) — keep as a
        // negative charge dated today so it still nets out correctly.
        charges.push({ date: entry.date, remaining: -paymentRemaining });
      }
    }
  }

  const rows = [];
  for (const [clientId, charges] of chargesByClient) {
    const client = db.clients.find((c) => c.id === clientId);
    if (!client) continue;
    let current = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let over90 = 0;
    for (const charge of charges) {
      if (charge.remaining === 0) continue;
      const age = daysBetween(charge.date, asOfStr);
      if (age <= 30) current += charge.remaining;
      else if (age <= 60) days31to60 += charge.remaining;
      else if (age <= 90) days61to90 += charge.remaining;
      else over90 += charge.remaining;
    }
    current = round2(current);
    days31to60 = round2(days31to60);
    days61to90 = round2(days61to90);
    over90 = round2(over90);
    const total = round2(current + days31to60 + days61to90 + over90);
    if (total === 0) continue;
    rows.push({ client, current, days31to60, days61to90, over90, total });
  }

  rows.sort((a, b) => b.total - a.total);

  const totals = {
    current: round2(rows.reduce((sum, r) => sum + r.current, 0)),
    days31to60: round2(rows.reduce((sum, r) => sum + r.days31to60, 0)),
    days61to90: round2(rows.reduce((sum, r) => sum + r.days61to90, 0)),
    over90: round2(rows.reduce((sum, r) => sum + r.over90, 0)),
    total: round2(rows.reduce((sum, r) => sum + r.total, 0)),
  };

  res.json({ asOf: asOfStr, rows, totals });
});

// Aged payables: mirror of aged receivables, but for amounts owed to
// vendors. Charges are journal entries that credit an Accounts
// Payable-type account and are tagged with a vendor; payments (debits to
// that account) are applied FIFO against the vendor's oldest outstanding
// bills first.
router.get("/aged-payables", async (req, res) => {
  const db = await readDatabase();
  const { asOf } = req.query;
  const asOfStr = asOf ? String(asOf) : new Date().toISOString().slice(0, 10);

  const apAccountIds = new Set(db.accounts.filter(isPayableAccount).map((a) => a.id));

  const entries = db.journalEntries
    .filter((e) => e.date <= asOfStr && e.vendorId && e.lines.some((l) => apAccountIds.has(l.accountId)))
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));

  interface Charge {
    date: string;
    remaining: number;
  }

  const chargesByVendor = new Map<string, Charge[]>();

  for (const entry of entries) {
    const apDelta = round2(
      entry.lines.reduce((sum, l) => (apAccountIds.has(l.accountId) ? sum + l.credit - l.debit : sum), 0)
    );
    if (apDelta === 0) continue;
    const vendorId = entry.vendorId as string;
    const charges = chargesByVendor.get(vendorId) ?? [];
    chargesByVendor.set(vendorId, charges);

    if (apDelta > 0) {
      charges.push({ date: entry.date, remaining: apDelta });
    } else {
      let paymentRemaining = -apDelta;
      for (const charge of charges) {
        if (paymentRemaining <= 0) break;
        if (charge.remaining <= 0) continue;
        const applied = Math.min(charge.remaining, paymentRemaining);
        charge.remaining = round2(charge.remaining - applied);
        paymentRemaining = round2(paymentRemaining - applied);
      }
      if (paymentRemaining > 0) {
        // Payment exceeds all known bills (credit balance) — keep as a
        // negative charge dated today so it still nets out correctly.
        charges.push({ date: entry.date, remaining: -paymentRemaining });
      }
    }
  }

  const rows = [];
  for (const [vendorId, charges] of chargesByVendor) {
    const vendor = db.vendors.find((v) => v.id === vendorId);
    if (!vendor) continue;
    let current = 0;
    let days31to60 = 0;
    let days61to90 = 0;
    let over90 = 0;
    for (const charge of charges) {
      if (charge.remaining === 0) continue;
      const age = daysBetween(charge.date, asOfStr);
      if (age <= 30) current += charge.remaining;
      else if (age <= 60) days31to60 += charge.remaining;
      else if (age <= 90) days61to90 += charge.remaining;
      else over90 += charge.remaining;
    }
    current = round2(current);
    days31to60 = round2(days31to60);
    days61to90 = round2(days61to90);
    over90 = round2(over90);
    const total = round2(current + days31to60 + days61to90 + over90);
    if (total === 0) continue;
    rows.push({ vendor, current, days31to60, days61to90, over90, total });
  }

  rows.sort((a, b) => b.total - a.total);

  const totals = {
    current: round2(rows.reduce((sum, r) => sum + r.current, 0)),
    days31to60: round2(rows.reduce((sum, r) => sum + r.days31to60, 0)),
    days61to90: round2(rows.reduce((sum, r) => sum + r.days61to90, 0)),
    over90: round2(rows.reduce((sum, r) => sum + r.over90, 0)),
    total: round2(rows.reduce((sum, r) => sum + r.total, 0)),
  };

  res.json({ asOf: asOfStr, rows, totals });
});

// Revenue per client for a date range. Attributes each revenue-account
// line to the journal entry's tagged client (if any); entries without a
// client are grouped under "Unassigned" so the totals still reconcile with
// the Income Statement's total revenue for the same period.
router.get("/revenue-by-client", async (req, res) => {
  const db = await readDatabase();
  const { start, end } = req.query;
  const startStr = start ? String(start) : null;
  const endStr = end ? String(end) : null;

  const revenueAccountIds = new Set(db.accounts.filter((a) => a.type === "revenue").map((a) => a.id));

  const entries = db.journalEntries
    .filter((e) => (startStr ? e.date >= startStr : true))
    .filter((e) => (endStr ? e.date <= endStr : true));

  const amountByClient = new Map<string | null, number>();

  for (const entry of entries) {
    const revenueAmount = round2(
      entry.lines.reduce((sum, l) => (revenueAccountIds.has(l.accountId) ? sum + l.credit - l.debit : sum), 0)
    );
    if (revenueAmount === 0) continue;
    const key = entry.clientId ?? null;
    amountByClient.set(key, round2((amountByClient.get(key) ?? 0) + revenueAmount));
  }

  const rows = [];
  for (const [clientId, amount] of amountByClient) {
    if (amount === 0) continue;
    const client = clientId ? db.clients.find((c) => c.id === clientId) ?? null : null;
    rows.push({ client, amount });
  }

  rows.sort((a, b) => b.amount - a.amount);

  const totalRevenue = round2(rows.reduce((sum, r) => sum + r.amount, 0));

  res.json({ start: startStr, end: endStr, rows, totalRevenue });
});

export default router;
