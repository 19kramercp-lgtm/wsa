import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { Aircraft } from "../types.js";

const router = Router();

// Converts an incoming form value to a finite number or null. Empty
// strings/undefined become null (field left blank) rather than 0, since
// these are all optional spec fields.
function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function applyFields(aircraft: Aircraft, body: Record<string, unknown>, isCreate: boolean) {
  const {
    tailNumber,
    make,
    model,
    category,
    class: aircraftClass,
    complex,
    highPerformance,
    tailwheel,
    active,
    emptyWeight,
    emptyWeightCG,
    usefulLoad,
    maxGrossWeight,
    cgRangeForward,
    cgRangeAft,
    engine,
    horsepower,
    fuelCapacity,
    usableFuel,
    oilCapacity,
    cruiseSpeed,
  } = body;

  if (tailNumber !== undefined || isCreate) aircraft.tailNumber = String(tailNumber ?? "").trim();
  if (make !== undefined) aircraft.make = String(make ?? "");
  if (model !== undefined) aircraft.model = String(model ?? "");
  if (category !== undefined) aircraft.category = String(category ?? "");
  if (aircraftClass !== undefined) aircraft.class = String(aircraftClass ?? "");
  if (complex !== undefined) aircraft.complex = Boolean(complex);
  if (highPerformance !== undefined) aircraft.highPerformance = Boolean(highPerformance);
  if (tailwheel !== undefined) aircraft.tailwheel = Boolean(tailwheel);
  if (active !== undefined) aircraft.active = Boolean(active);
  if (emptyWeight !== undefined) aircraft.emptyWeight = toNullableNumber(emptyWeight);
  if (emptyWeightCG !== undefined) aircraft.emptyWeightCG = toNullableNumber(emptyWeightCG);
  if (usefulLoad !== undefined) aircraft.usefulLoad = toNullableNumber(usefulLoad);
  if (maxGrossWeight !== undefined) aircraft.maxGrossWeight = toNullableNumber(maxGrossWeight);
  if (cgRangeForward !== undefined) aircraft.cgRangeForward = toNullableNumber(cgRangeForward);
  if (cgRangeAft !== undefined) aircraft.cgRangeAft = toNullableNumber(cgRangeAft);
  if (engine !== undefined) aircraft.engine = String(engine ?? "");
  if (horsepower !== undefined) aircraft.horsepower = toNullableNumber(horsepower);
  if (fuelCapacity !== undefined) aircraft.fuelCapacity = toNullableNumber(fuelCapacity);
  if (usableFuel !== undefined) aircraft.usableFuel = toNullableNumber(usableFuel);
  if (oilCapacity !== undefined) aircraft.oilCapacity = toNullableNumber(oilCapacity);
  if (cruiseSpeed !== undefined) aircraft.cruiseSpeed = toNullableNumber(cruiseSpeed);
}

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  res.json([...db.aircraft].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber)));
});

router.post("/", async (req, res) => {
  const body = req.body ?? {};
  if (!body.tailNumber || !String(body.tailNumber).trim()) {
    return res.status(400).json({ error: "Tail number is required" });
  }

  const db = await readDatabase();
  const aircraft: Aircraft = {
    id: uuidv4(),
    tailNumber: "",
    make: "",
    model: "",
    category: "",
    class: "",
    complex: false,
    highPerformance: false,
    tailwheel: false,
    active: true,
    emptyWeight: null,
    emptyWeightCG: null,
    usefulLoad: null,
    maxGrossWeight: null,
    cgRangeForward: null,
    cgRangeAft: null,
    engine: "",
    horsepower: null,
    fuelCapacity: null,
    usableFuel: null,
    oilCapacity: null,
    cruiseSpeed: null,
    createdAt: new Date().toISOString(),
  };
  applyFields(aircraft, body, true);
  db.aircraft.push(aircraft);
  await writeDatabase(db);
  res.status(201).json(aircraft);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const aircraft = db.aircraft.find((a) => a.id === req.params.id);
  if (!aircraft) return res.status(404).json({ error: "Aircraft not found" });

  const body = req.body ?? {};
  if (body.tailNumber !== undefined && !String(body.tailNumber).trim()) {
    return res.status(400).json({ error: "Tail number cannot be empty" });
  }
  applyFields(aircraft, body, false);

  await writeDatabase(db);
  res.json(aircraft);
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
