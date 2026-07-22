import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { LogbookEntry } from "../types.js";

const router = Router();

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const NUMERIC_FIELDS = [
  "totalTime",
  "picTime",
  "soloTime",
  "crossCountryTime",
  "nightTime",
  "actualInstrumentTime",
  "simulatedInstrumentTime",
  "dualReceived",
] as const;

export interface LogbookTotals {
  totalTime: number;
  picTime: number;
  soloTime: number;
  crossCountryTime: number;
  nightTime: number;
  actualInstrumentTime: number;
  simulatedInstrumentTime: number;
  instrumentTime: number;
  dualReceived: number;
  dayLandings: number;
  nightLandings: number;
  entryCount: number;
}

export function computeLogbookTotals(entries: LogbookEntry[]): LogbookTotals {
  const totals: LogbookTotals = {
    totalTime: 0,
    picTime: 0,
    soloTime: 0,
    crossCountryTime: 0,
    nightTime: 0,
    actualInstrumentTime: 0,
    simulatedInstrumentTime: 0,
    instrumentTime: 0,
    dualReceived: 0,
    dayLandings: 0,
    nightLandings: 0,
    entryCount: entries.length,
  };
  for (const e of entries) {
    for (const field of NUMERIC_FIELDS) {
      totals[field] = round2(totals[field] + (e[field] || 0));
    }
    totals.dayLandings += e.dayLandings || 0;
    totals.nightLandings += e.nightLandings || 0;
  }
  totals.instrumentTime = round2(totals.actualInstrumentTime + totals.simulatedInstrumentTime);
  return totals;
}

router.get("/", async (req, res) => {
  const db = await readDatabase();
  const { clientId } = req.query;
  let entries = [...db.logbookEntries];
  if (clientId) entries = entries.filter((e) => e.clientId === clientId);
  entries.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  res.json(entries);
});

router.get("/totals/:clientId", async (req, res) => {
  const db = await readDatabase();
  const entries = db.logbookEntries.filter((e) => e.clientId === req.params.clientId);
  res.json(computeLogbookTotals(entries));
});

router.post("/", async (req, res) => {
  const {
    clientId,
    date,
    aircraftId,
    instructorId,
    route,
    totalTime,
    picTime,
    soloTime,
    crossCountryTime,
    nightTime,
    actualInstrumentTime,
    simulatedInstrumentTime,
    dualReceived,
    dayLandings,
    nightLandings,
    remarks,
  } = req.body ?? {};

  if (!clientId || !date) {
    return res.status(400).json({ error: "clientId and date are required" });
  }
  const db = await readDatabase();
  if (!db.clients.some((c) => c.id === clientId)) {
    return res.status(400).json({ error: "clientId must reference a valid client" });
  }
  if (aircraftId && !db.aircraft.some((a) => a.id === aircraftId)) {
    return res.status(400).json({ error: "aircraftId must reference a valid aircraft" });
  }
  if (instructorId && !db.instructors.some((i) => i.id === instructorId)) {
    return res.status(400).json({ error: "instructorId must reference a valid instructor" });
  }

  const now = new Date().toISOString();
  const entry: LogbookEntry = {
    id: uuidv4(),
    clientId,
    date: String(date),
    aircraftId: aircraftId || null,
    instructorId: instructorId || null,
    route: route ?? "",
    totalTime: round2(Number(totalTime) || 0),
    picTime: round2(Number(picTime) || 0),
    soloTime: round2(Number(soloTime) || 0),
    crossCountryTime: round2(Number(crossCountryTime) || 0),
    nightTime: round2(Number(nightTime) || 0),
    actualInstrumentTime: round2(Number(actualInstrumentTime) || 0),
    simulatedInstrumentTime: round2(Number(simulatedInstrumentTime) || 0),
    dualReceived: round2(Number(dualReceived) || 0),
    dayLandings: Math.max(0, Math.trunc(Number(dayLandings) || 0)),
    nightLandings: Math.max(0, Math.trunc(Number(nightLandings) || 0)),
    remarks: remarks ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.logbookEntries.push(entry);
  await writeDatabase(db);
  res.status(201).json(entry);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const entry = db.logbookEntries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Logbook entry not found" });

  const body = req.body ?? {};
  if (body.aircraftId !== undefined && body.aircraftId && !db.aircraft.some((a) => a.id === body.aircraftId)) {
    return res.status(400).json({ error: "aircraftId must reference a valid aircraft" });
  }
  if (
    body.instructorId !== undefined &&
    body.instructorId &&
    !db.instructors.some((i) => i.id === body.instructorId)
  ) {
    return res.status(400).json({ error: "instructorId must reference a valid instructor" });
  }

  if (body.date !== undefined) entry.date = String(body.date);
  if (body.aircraftId !== undefined) entry.aircraftId = body.aircraftId || null;
  if (body.instructorId !== undefined) entry.instructorId = body.instructorId || null;
  if (body.route !== undefined) entry.route = String(body.route);
  for (const field of NUMERIC_FIELDS) {
    if (body[field] !== undefined) entry[field] = round2(Number(body[field]) || 0);
  }
  if (body.dayLandings !== undefined) entry.dayLandings = Math.max(0, Math.trunc(Number(body.dayLandings) || 0));
  if (body.nightLandings !== undefined) entry.nightLandings = Math.max(0, Math.trunc(Number(body.nightLandings) || 0));
  if (body.remarks !== undefined) entry.remarks = String(body.remarks);
  entry.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  res.json(entry);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const entry = db.logbookEntries.find((e) => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: "Logbook entry not found" });

  db.logbookEntries = db.logbookEntries.filter((e) => e.id !== entry.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
