import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { fullName, readDatabase, writeDatabase } from "../db.js";
import type { Instructor } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.instructors].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const { firstName, lastName, certificateNumber, ratings, certificateExpiration, phone, email } = req.body ?? {};
  if (!firstName || !String(firstName).trim()) {
    return res.status(400).json({ error: "firstName is required" });
  }
  const db = await readDatabase();
  const instructor: Instructor = {
    id: uuidv4(),
    firstName: String(firstName).trim(),
    lastName: lastName ? String(lastName).trim() : "",
    certificateNumber: certificateNumber ?? "",
    ratings: ratings ?? "",
    certificateExpiration: certificateExpiration || null,
    phone: phone ?? "",
    email: email ?? "",
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.instructors.push(instructor);
  await writeDatabase(db);
  res.status(201).json(instructor);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const instructor = db.instructors.find((i) => i.id === req.params.id);
  if (!instructor) return res.status(404).json({ error: "Instructor not found" });

  const { firstName, lastName, certificateNumber, ratings, certificateExpiration, phone, email, active } = req.body ?? {};
  if (firstName !== undefined) {
    if (!String(firstName).trim()) return res.status(400).json({ error: "firstName cannot be empty" });
    instructor.firstName = String(firstName).trim();
  }
  if (lastName !== undefined) instructor.lastName = String(lastName);
  if (certificateNumber !== undefined) instructor.certificateNumber = String(certificateNumber);
  if (ratings !== undefined) instructor.ratings = String(ratings);
  if (certificateExpiration !== undefined) instructor.certificateExpiration = certificateExpiration || null;
  if (phone !== undefined) instructor.phone = String(phone);
  if (email !== undefined) instructor.email = String(email);
  if (active !== undefined) instructor.active = Boolean(active);

  await writeDatabase(db);
  res.json(instructor);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const instructor = db.instructors.find((i) => i.id === req.params.id);
  if (!instructor) return res.status(404).json({ error: "Instructor not found" });

  const inUse =
    db.logbookEntries.some((e) => e.instructorId === instructor.id) ||
    db.endorsements.some((e) => e.instructorId === instructor.id);
  if (inUse) {
    return res.status(409).json({
      error: "This instructor has logbook entries or endorsements on record and cannot be deleted.",
    });
  }

  db.instructors = db.instructors.filter((i) => i.id !== instructor.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
