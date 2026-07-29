import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { aircraftLabel, fullName, readDatabase, writeDatabase } from "../db.js";
import type { CalendarEvent, CalendarSessionType, Database } from "../types.js";

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

// The title isn't user-entered — it's derived from the student, session
// type, and aircraft/classroom so it always reflects the event's current
// details.
function generateTitle(
  db: Database,
  params: { sessionType: CalendarSessionType; studentClientId: string; aircraftId: string | null; classroomId: string | null }
): string {
  const student = db.clients.find((c) => c.id === params.studentClientId);
  const studentName = student ? fullName(student) : "Unknown Student";
  const sessionLabel = params.sessionType === "flight" ? "Flight" : "Ground";
  const aircraft = db.aircraft.find((a) => a.id === params.aircraftId);
  const resourceName =
    params.sessionType === "flight" ? (aircraft ? aircraftLabel(aircraft) : undefined) : db.classrooms.find((c) => c.id === params.classroomId)?.name;
  return resourceName ? `${studentName} — ${sessionLabel} (${resourceName})` : `${studentName} — ${sessionLabel}`;
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
  const { date, startTime, endTime, sessionType, aircraftId, classroomId, studentClientId, instructorName } = body;
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
  const resolvedAircraftId = sessionType === "flight" ? aircraftId : null;
  const resolvedClassroomId = sessionType === "ground" ? classroomId : null;
  const event: CalendarEvent = {
    id: uuidv4(),
    title: generateTitle(db, {
      sessionType,
      studentClientId: String(studentClientId),
      aircraftId: resolvedAircraftId,
      classroomId: resolvedClassroomId,
    }),
    date: String(date),
    startTime: String(startTime),
    endTime: String(endTime),
    sessionType,
    aircraftId: resolvedAircraftId,
    classroomId: resolvedClassroomId,
    studentClientId: String(studentClientId),
    instructorName: String(instructorName).trim(),
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
  const { date, startTime, endTime, sessionType, aircraftId, classroomId, studentClientId, instructorName } = body;

  const nextSessionType: CalendarSessionType = sessionType !== undefined ? sessionType : event.sessionType;
  const nextAircraftId = aircraftId !== undefined ? aircraftId : event.aircraftId;
  const nextClassroomId = classroomId !== undefined ? classroomId : event.classroomId;
  const sessionError = validateSessionFields({
    sessionType: nextSessionType,
    aircraftId: nextSessionType === "flight" ? nextAircraftId : undefined,
    classroomId: nextSessionType === "ground" ? nextClassroomId : undefined,
  });
  if (sessionError) return res.status(400).json({ error: sessionError });

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
  const nextStudentClientId = studentClientId !== undefined ? studentClientId : event.studentClientId;
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
  event.title = generateTitle(db, {
    sessionType: nextSessionType,
    studentClientId: String(nextStudentClientId),
    aircraftId: event.aircraftId,
    classroomId: event.classroomId,
  });
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
