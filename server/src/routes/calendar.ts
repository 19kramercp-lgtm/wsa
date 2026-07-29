import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { CalendarEvent, CalendarSessionType } from "../types.js";

const router = Router();

const SESSION_TYPES: CalendarSessionType[] = ["flight", "ground"];

function validateSessionFields(body: Record<string, unknown>): string | null {
  const { sessionType, aircraftId, classroomId } = body;
  if (!SESSION_TYPES.includes(sessionType as CalendarSessionType)) {
    return "Session type must be flight or ground";
  }
  if (sessionType === "flight" && !aircraftId) {
    return "Aircraft is required for a flight session";
  }
  if (sessionType === "ground" && !classroomId) {
    return "Classroom is required for a ground session";
  }
  return null;
}

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
  const body = req.body ?? {};
  const { title, date, startTime, endTime, sessionType, aircraftId, classroomId, studentClientId, instructorName, notes } =
    body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return res.status(400).json({ error: "A valid date (YYYY-MM-DD) is required" });
  }
  if (!startTime) return res.status(400).json({ error: "Start time is required" });
  if (!endTime) return res.status(400).json({ error: "End time is required" });
  if (!studentClientId) return res.status(400).json({ error: "Student is required" });
  if (!instructorName || !String(instructorName).trim()) return res.status(400).json({ error: "Instructor is required" });
  const sessionError = validateSessionFields(body);
  if (sessionError) return res.status(400).json({ error: sessionError });

  const db = await readDatabase();
  if (!db.clients.some((c) => c.id === studentClientId)) {
    return res.status(400).json({ error: "Student not found" });
  }
  if (sessionType === "flight" && !db.aircraft.some((a) => a.id === aircraftId)) {
    return res.status(400).json({ error: "Aircraft not found" });
  }
  if (sessionType === "ground" && !db.classrooms.some((c) => c.id === classroomId)) {
    return res.status(400).json({ error: "Classroom not found" });
  }

  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: uuidv4(),
    title: String(title).trim(),
    date: String(date),
    startTime: String(startTime),
    endTime: String(endTime),
    sessionType,
    aircraftId: sessionType === "flight" ? aircraftId : null,
    classroomId: sessionType === "ground" ? classroomId : null,
    studentClientId: String(studentClientId),
    instructorName: String(instructorName).trim(),
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

  const body = req.body ?? {};
  const { title, date, startTime, endTime, sessionType, aircraftId, classroomId, studentClientId, instructorName, notes } =
    body;

  const nextSessionType: CalendarSessionType = sessionType !== undefined ? sessionType : event.sessionType;
  const nextAircraftId = aircraftId !== undefined ? aircraftId : event.aircraftId;
  const nextClassroomId = classroomId !== undefined ? classroomId : event.classroomId;
  const sessionError = validateSessionFields({
    sessionType: nextSessionType,
    aircraftId: nextSessionType === "flight" ? nextAircraftId : undefined,
    classroomId: nextSessionType === "ground" ? nextClassroomId : undefined,
  });
  if (sessionError) return res.status(400).json({ error: sessionError });

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
  if (startTime !== undefined) {
    if (!String(startTime)) return res.status(400).json({ error: "Start time is required" });
    event.startTime = String(startTime);
  }
  if (endTime !== undefined) {
    if (!String(endTime)) return res.status(400).json({ error: "End time is required" });
    event.endTime = String(endTime);
  }
  if (studentClientId !== undefined) {
    if (!studentClientId) return res.status(400).json({ error: "Student is required" });
    if (!db.clients.some((c) => c.id === studentClientId)) return res.status(400).json({ error: "Student not found" });
    event.studentClientId = String(studentClientId);
  }
  if (instructorName !== undefined) {
    if (!String(instructorName).trim()) return res.status(400).json({ error: "Instructor is required" });
    event.instructorName = String(instructorName).trim();
  }
  if (nextSessionType === "flight" && !db.aircraft.some((a) => a.id === nextAircraftId)) {
    return res.status(400).json({ error: "Aircraft not found" });
  }
  if (nextSessionType === "ground" && !db.classrooms.some((c) => c.id === nextClassroomId)) {
    return res.status(400).json({ error: "Classroom not found" });
  }
  event.sessionType = nextSessionType;
  event.aircraftId = nextSessionType === "flight" ? nextAircraftId : null;
  event.classroomId = nextSessionType === "ground" ? nextClassroomId : null;
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
