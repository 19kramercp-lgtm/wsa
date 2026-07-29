import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { CalendarEvent } from "../types.js";

const router = Router();

router.get("/", async (req, res) => {
  const db = await readDatabase();
  const { start, end } = req.query;
  let events = [...db.calendarEvents];
  if (start) events = events.filter((e) => e.date >= String(start));
  if (end) events = events.filter((e) => e.date <= String(end));
  events.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  res.json(events);
});

router.post("/", async (req, res) => {
  const { title, date, startTime, endTime, studentClientId, instructorName, notes } = req.body ?? {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return res.status(400).json({ error: "A valid date (YYYY-MM-DD) is required" });
  }

  const db = await readDatabase();
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: uuidv4(),
    title: String(title).trim(),
    date: String(date),
    startTime: startTime ?? "",
    endTime: endTime ?? "",
    studentClientId: studentClientId || null,
    instructorName: instructorName ?? "",
    notes: notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.calendarEvents.push(event);
  await writeDatabase(db);
  res.status(201).json(event);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const event = db.calendarEvents.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const { title, date, startTime, endTime, studentClientId, instructorName, notes } = req.body ?? {};
  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ error: "Title cannot be empty" });
    event.title = String(title).trim();
  }
  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: "A valid date (YYYY-MM-DD) is required" });
    }
    event.date = String(date);
  }
  if (startTime !== undefined) event.startTime = String(startTime);
  if (endTime !== undefined) event.endTime = String(endTime);
  if (studentClientId !== undefined) event.studentClientId = studentClientId || null;
  if (instructorName !== undefined) event.instructorName = String(instructorName);
  if (notes !== undefined) event.notes = String(notes);
  event.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  res.json(event);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const event = db.calendarEvents.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });

  db.calendarEvents = db.calendarEvents.filter((e) => e.id !== event.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
