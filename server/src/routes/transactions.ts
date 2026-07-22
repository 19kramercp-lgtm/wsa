import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { JournalEntry } from "../types.js";

const router = Router();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

router.post("/revenue", async (req, res) => {
  const { date, description, revenueAccountId, depositAccountId, amount, reference, payer } = req.body ?? {};
  const amt = round2(Number(amount));
  if (!date || !revenueAccountId || !depositAccountId || !amt || amt <= 0) {
    return res.status(400).json({ error: "date, revenueAccountId, depositAccountId, and a positive amount are required" });
  }
  const db = await readDatabase();
  const revenueAccount = db.accounts.find((a) => a.id === revenueAccountId);
  const depositAccount = db.accounts.find((a) => a.id === depositAccountId);
  if (!revenueAccount || revenueAccount.type !== "revenue") {
    return res.status(400).json({ error: "revenueAccountId must reference a revenue account" });
  }
  if (!depositAccount) {
    return res.status(400).json({ error: "depositAccountId must reference a valid account" });
  }

  const now = new Date().toISOString();
  const memo = description || `Revenue: ${revenueAccount.name}${payer ? ` — ${payer}` : ""}`;
  const entry: JournalEntry = {
    id: uuidv4(),
    date: String(date),
    memo,
    reference: reference ?? String(db.meta.nextJournalNumber).padStart(5, "0"),
    source: "revenue",
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
  const { date, description, expenseAccountId, paymentAccountId, amount, reference, payee } = req.body ?? {};
  const amt = round2(Number(amount));
  if (!date || !expenseAccountId || !paymentAccountId || !amt || amt <= 0) {
    return res.status(400).json({ error: "date, expenseAccountId, paymentAccountId, and a positive amount are required" });
  }
  const db = await readDatabase();
  const expenseAccount = db.accounts.find((a) => a.id === expenseAccountId);
  const paymentAccount = db.accounts.find((a) => a.id === paymentAccountId);
  if (!expenseAccount || expenseAccount.type !== "expense") {
    return res.status(400).json({ error: "expenseAccountId must reference an expense account" });
  }
  if (!paymentAccount) {
    return res.status(400).json({ error: "paymentAccountId must reference a valid account" });
  }

  const now = new Date().toISOString();
  const memo = description || `Expense: ${expenseAccount.name}${payee ? ` — ${payee}` : ""}`;
  const entry: JournalEntry = {
    id: uuidv4(),
    date: String(date),
    memo,
    reference: reference ?? String(db.meta.nextJournalNumber).padStart(5, "0"),
    source: "expense",
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
