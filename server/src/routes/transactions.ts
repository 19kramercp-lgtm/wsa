import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { fullName, isPeriodClosed, readDatabase, writeDatabase } from "../db.js";
import type { JournalEntry } from "../types.js";

const router = Router();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function closedPeriodError(date: string): { error: string } {
  return {
    error: `The period ${date.slice(0, 7)} is closed for editing. Reopen it on the Reports tab to make changes.`,
  };
}

router.post("/revenue", async (req, res) => {
  const { date, description, revenueAccountId, depositAccountId, amount, reference, clientId } = req.body ?? {};
  const amt = round2(Number(amount));
  if (!date || !revenueAccountId || !depositAccountId || !amt || amt <= 0 || !clientId) {
    return res
      .status(400)
      .json({ error: "date, revenueAccountId, depositAccountId, clientId, and a positive amount are required" });
  }
  const db = await readDatabase();
  if (isPeriodClosed(String(date), db.closedPeriods)) {
    return res.status(409).json(closedPeriodError(String(date)));
  }
  const revenueAccount = db.accounts.find((a) => a.id === revenueAccountId);
  const depositAccount = db.accounts.find((a) => a.id === depositAccountId);
  const client = db.clients.find((c) => c.id === clientId);
  if (!revenueAccount || revenueAccount.type !== "revenue") {
    return res.status(400).json({ error: "revenueAccountId must reference a revenue account" });
  }
  if (!depositAccount) {
    return res.status(400).json({ error: "depositAccountId must reference a valid account" });
  }
  if (!client) {
    return res.status(400).json({ error: "clientId must reference a valid client" });
  }

  const now = new Date().toISOString();
  const memo = description || `Revenue: ${revenueAccount.name} — ${fullName(client)}`;
  const entry: JournalEntry = {
    id: uuidv4(),
    date: String(date),
    memo,
    reference: reference ?? String(db.meta.nextJournalNumber).padStart(5, "0"),
    source: "revenue",
    clientId: client.id,
    lines: [
      { id: uuidv4(), accountId: depositAccount.id, debit: amt, credit: 0, description: memo },
      { id: uuidv4(), accountId: revenueAccount.id, debit: 0, credit: amt, description: memo },
    ],
    createdAt: now,
    updatedAt: now,
  };
  db.meta.nextJournalNumber += 1;
  db.journalEntries.push(entry);
  await writeDatabase(db);
  res.status(201).json(entry);
});

router.post("/expense", async (req, res) => {
  const { date, description, expenseAccountId, paymentAccountId, amount, reference, clientId } = req.body ?? {};
  const amt = round2(Number(amount));
  if (!date || !expenseAccountId || !paymentAccountId || !amt || amt <= 0 || !clientId) {
    return res
      .status(400)
      .json({ error: "date, expenseAccountId, paymentAccountId, clientId, and a positive amount are required" });
  }
  const db = await readDatabase();
  if (isPeriodClosed(String(date), db.closedPeriods)) {
    return res.status(409).json(closedPeriodError(String(date)));
  }
  const expenseAccount = db.accounts.find((a) => a.id === expenseAccountId);
  const paymentAccount = db.accounts.find((a) => a.id === paymentAccountId);
  const client = db.clients.find((c) => c.id === clientId);
  if (!expenseAccount || expenseAccount.type !== "expense") {
    return res.status(400).json({ error: "expenseAccountId must reference an expense account" });
  }
  if (!paymentAccount) {
    return res.status(400).json({ error: "paymentAccountId must reference a valid account" });
  }
  if (!client) {
    return res.status(400).json({ error: "clientId must reference a valid client" });
  }

  const now = new Date().toISOString();
  const memo = description || `Expense: ${expenseAccount.name} — ${fullName(client)}`;
  const entry: JournalEntry = {
    id: uuidv4(),
    date: String(date),
    memo,
    reference: reference ?? String(db.meta.nextJournalNumber).padStart(5, "0"),
    source: "expense",
    clientId: client.id,
    lines: [
      { id: uuidv4(), accountId: expenseAccount.id, debit: amt, credit: 0, description: memo },
      { id: uuidv4(), accountId: paymentAccount.id, debit: 0, credit: amt, description: memo },
    ],
    createdAt: now,
    updatedAt: now,
  };
  db.meta.nextJournalNumber += 1;
  db.journalEntries.push(entry);
  await writeDatabase(db);
  res.status(201).json(entry);
});

export default router;
