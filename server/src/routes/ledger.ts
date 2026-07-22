import { Router } from "express";
import { readDatabase } from "../db.js";

const router = Router();

router.get("/:accountId", async (req, res) => {
  const db = await readDatabase();
  const account = db.accounts.find((a) => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const { start, end } = req.query;

  const entries = [...db.journalEntries]
    .filter((e) => e.lines.some((l) => l.accountId === account.id))
    .filter((e) => (start ? e.date >= String(start) : true))
    .filter((e) => (end ? e.date <= String(end) : true))
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));

  let balance = 0;
  const isDebitNormal = account.normalBalance === "debit";
  const rows = entries.map((e) => {
    const line = e.lines.find((l) => l.accountId === account.id)!;
    const delta = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
    balance += delta;
    return {
      journalEntryId: e.id,
      date: e.date,
      reference: e.reference,
      memo: line.description || e.memo,
      source: e.source,
      debit: line.debit,
      credit: line.credit,
      balance: Math.round((balance + Number.EPSILON) * 100) / 100,
    };
  });

  res.json({ account, rows });
});

export default router;
