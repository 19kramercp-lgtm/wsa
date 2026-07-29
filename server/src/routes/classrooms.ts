import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { Classroom } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  res.json([...db.classrooms].sort((a, b) => a.name.localeCompare(b.name)));
});

router.post("/", async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });

  const db = await readDatabase();
  const classroom: Classroom = {
    id: uuidv4(),
    name: String(name).trim(),
    createdAt: new Date().toISOString(),
  };
  db.classrooms.push(classroom);
  await writeDatabase(db);
  res.status(201).json(classroom);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const classroom = db.classrooms.find((c) => c.id === req.params.id);
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const inUse = db.calendarEvents.some((e) => e.classroomId === classroom.id);
  if (inUse) {
    return res.status(409).json({ error: "This classroom is used on calendar events and cannot be deleted." });
  }

  db.classrooms = db.classrooms.filter((c) => c.id !== classroom.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
