import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { Aircraft } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  res.json([...db.aircraft].sort((a, b) => a.name.localeCompare(b.name)));
});

router.post("/", async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });

  const db = await readDatabase();
  const aircraft: Aircraft = {
    id: uuidv4(),
    name: String(name).trim(),
    createdAt: new Date().toISOString(),
  };
  db.aircraft.push(aircraft);
  await writeDatabase(db);
  res.status(201).json(aircraft);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const aircraft = db.aircraft.find((a) => a.id === req.params.id);
  if (!aircraft) return res.status(404).json({ error: "Aircraft not found" });

  const inUse = db.calendarEvents.some((e) => e.aircraftId === aircraft.id);
  if (inUse) {
    return res.status(409).json({ error: "This aircraft is used on calendar events and cannot be deleted." });
  }

  db.aircraft = db.aircraft.filter((a) => a.id !== aircraft.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
