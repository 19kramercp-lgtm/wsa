import { Router } from "express";
import { readDatabase, writeDatabase } from "../db.js";

const router = Router();

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.closedPeriods].sort((a, b) => b.period.localeCompare(a.period));
  res.json(sorted);
});

router.post("/close", async (req, res) => {
  const { period } = req.body ?? {};
  if (typeof period !== "string" || !PERIOD_RE.test(period)) {
    return res.status(400).json({ error: "period must be in YYYY-MM format" });
  }
  const db = await readDatabase();
  if (db.closedPeriods.some((cp) => cp.period === period)) {
    return res.status(409).json({ error: `${period} is already closed` });
  }
  db.closedPeriods.push({ period, closedAt: new Date().toISOString() });
  await writeDatabase(db);
  res.status(201).json({ period, closedAt: new Date().toISOString() });
});

router.post("/reopen", async (req, res) => {
  const { period } = req.body ?? {};
  if (typeof period !== "string" || !PERIOD_RE.test(period)) {
    return res.status(400).json({ error: "period must be in YYYY-MM format" });
  }
  const db = await readDatabase();
  if (!db.closedPeriods.some((cp) => cp.period === period)) {
    return res.status(404).json({ error: `${period} is not closed` });
  }
  db.closedPeriods = db.closedPeriods.filter((cp) => cp.period !== period);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
