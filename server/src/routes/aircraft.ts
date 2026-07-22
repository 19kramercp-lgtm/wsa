import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { Aircraft } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.aircraft].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const { tailNumber, makeModel, category, isComplex, isHighPerformance, isTailwheel } = req.body ?? {};
  if (!tailNumber || !String(tailNumber).trim()) {
    return res.status(400).json({ error: "tailNumber is required" });
  }
  const db = await readDatabase();
  const aircraft: Aircraft = {
    id: uuidv4(),
    tailNumber: String(tailNumber).trim().toUpperCase(),
    makeModel: makeModel ?? "",
    category: category ?? "Airplane Single-Engine Land",
    isComplex: Boolean(isComplex),
    isHighPerformance: Boolean(isHighPerformance),
    isTailwheel: Boolean(isTailwheel),
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.aircraft.push(aircraft);
  await writeDatabase(db);
  res.status(201).json(aircraft);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const aircraft = db.aircraft.find((a) => a.id === req.params.id);
  if (!aircraft) return res.status(404).json({ error: "Aircraft not found" });

  const { tailNumber, makeModel, category, isComplex, isHighPerformance, isTailwheel, active } = req.body ?? {};
  if (tailNumber !== undefined) {
    if (!String(tailNumber).trim()) return res.status(400).json({ error: "tailNumber cannot be empty" });
    aircraft.tailNumber = String(tailNumber).trim().toUpperCase();
  }
  if (makeModel !== undefined) aircraft.makeModel = String(makeModel);
  if (category !== undefined) aircraft.category = String(category);
  if (isComplex !== undefined) aircraft.isComplex = Boolean(isComplex);
  if (isHighPerformance !== undefined) aircraft.isHighPerformance = Boolean(isHighPerformance);
  if (isTailwheel !== undefined) aircraft.isTailwheel = Boolean(isTailwheel);
  if (active !== undefined) aircraft.active = Boolean(active);

  await writeDatabase(db);
  res.json(aircraft);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const aircraft = db.aircraft.find((a) => a.id === req.params.id);
  if (!aircraft) return res.status(404).json({ error: "Aircraft not found" });

  const inUse = db.logbookEntries.some((e) => e.aircraftId === aircraft.id);
  if (inUse) {
    return res.status(409).json({ error: "This aircraft has logbook entries on record and cannot be deleted." });
  }

  db.aircraft = db.aircraft.filter((a) => a.id !== aircraft.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
