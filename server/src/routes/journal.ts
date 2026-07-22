import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { isPeriodClosed, readDatabase, writeDatabase } from "../db.js";
import type { JournalEntry, JournalLine } from "../types.js";

function closedPeriodError(date: string): { error: string } {
  return {
    error: `The period ${date.slice(0, 7)} is closed for editing. Reopen it on the Reports tab to make changes.`,
  };
}

const router = Router();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function validateLines(rawLines: unknown): { lines: JournalLine[] } | { error: string } {
  if (!Array.isArray(rawLines) || rawLines.length < 2) {
    return { error: "A journal entry requires at least two lines" };
  }
  const lines: JournalLine[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const raw of rawLines) {
    const debit = round2(Number(raw?.debit) || 0);
    const credit = round2(Number(raw?.credit) || 0);
    if (!raw?.accountId) return { error: "Each line requires an accountId" };
    if (debit < 0 || credit < 0) return { error: "Debit and credit amounts must not be negative" };
    if (debit > 0 && credit > 0) return { error: "A line cannot have both a debit and a credit amount" };
    if (debit === 0 && credit === 0) return { error: "Each line must have a nonzero debit or credit" };
    totalDebit = round2(totalDebit + debit);
    totalCredit = round2(totalCredit + credit);
    lines.push({
      id: raw.id ?? uuidv4(),
      accountId: raw.accountId,
      debit,
      credit,
      description: raw.description ?? "",
    });
  }
  if (totalDebit !== totalCredit) {
    return { error: `Entry does not balance: debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}` };
  }
  return { lines };
}

router.get("/", async (req, res) => {
  const db = await readDatabase();
  let entries = [...db.journalEntries];
  const { start, end, accountId, source } = req.query;
  if (start) entries = entries.filter((e) => e.date >= String(start));
  if (end) entries = entries.filter((e) => e.date <= String(end));
  if (accountId) entries = entries.filter((e) => e.lines.some((l) => l.accountId === accountId));
  if (source) entries = entries.filter((e) => e.source === source);
  entries.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  res.json(entries);
});

router.post("/", async (req, res) => {
  const { date, memo, reference, lines: rawLines, source, clientId } = req.body ?? {};
  if (!date) return res.status(400).json({ error: "date is required" });

  const result = validateLines(rawLines);
  if ("error" in result) return res.status(400).json({ error: result.error });

  const db = await readDatabase();
  if (isPeriodClosed(String(date), db.closedPeriods)) {
    return res.status(409).json(closedPeriodError(String(date)));
  }
  const validAccountIds = new Set(db.accounts.map((a) => a.id));
  for (const line of result.lines) {
    if (!validAccountIds.has(line.accountId)) {
      return res.status(400).json({ error: `Unknown accountId ${line.accountId}` });
    }
  }
  if (clientId && !db.clients.some((c) => c.id === clientId)) {
    return res.status(400).json({ error: "clientId must reference a valid client" });
  }

  const now = new Date().toISOString();
  const entry: JournalEntry = {
    id: uuidv4(),
    date: String(date),
    memo: memo ?? "",
    reference: reference ?? String(db.meta.nextJournalNumber).padStart(5, "0"),
    source: source ?? "manual",
    clientId: clientId ?? null,
    lines: result.lines,
    createdAt: now,
    updatedAt: now,
  };
  db.meta.nextJournalNumber += 1;
  db.journalEntries.push(entry);
  await writeDatabase(db);
  res.status(201).json(entry);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const entry = db.journalEntries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Journal entry not found" });

  if (isPeriodClosed(entry.date, db.closedPeriods)) {
    return res.status(409).json(closedPeriodError(entry.date));
  }

  const { date, memo, reference, lines: rawLines, clientId } = req.body ?? {};
  if (date !== undefined && isPeriodClosed(String(date), db.closedPeriods)) {
    return res.status(409).json(closedPeriodError(String(date)));
  }
  if (rawLines !== undefined) {
    const result = validateLines(rawLines);
    if ("error" in result) return res.status(400).json({ error: result.error });
    const validAccountIds = new Set(db.accounts.map((a) => a.id));
    for (const line of result.lines) {
      if (!validAccountIds.has(line.accountId)) {
        return res.status(400).json({ error: `Unknown accountId ${line.accountId}` });
      }
    }
    entry.lines = result.lines;
  }
  if (clientId !== undefined) {
    if (clientId && !db.clients.some((c) => c.id === clientId)) {
      return res.status(400).json({ error: "clientId must reference a valid client" });
    }
    entry.clientId = clientId || null;
  }
  if (date !== undefined) entry.date = String(date);
  if (memo !== undefined) entry.memo = String(memo);
  if (reference !== undefined) entry.reference = String(reference);
  entry.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  res.json(entry);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const entry = db.journalEntries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Journal entry not found" });
  if (isPeriodClosed(entry.date, db.closedPeriods)) {
    return res.status(409).json(closedPeriodError(entry.date));
  }
  db.journalEntries = db.journalEntries.filter((e) => e.id !== req.params.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
