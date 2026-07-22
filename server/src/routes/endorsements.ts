import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import { ENDORSEMENT_TEMPLATES } from "../reference.js";
import type { EndorsementRecord } from "../types.js";

const router = Router();

function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

router.get("/templates", (_req, res) => {
  res.json(ENDORSEMENT_TEMPLATES);
});

router.get("/", async (req, res) => {
  const db = await readDatabase();
  const { clientId } = req.query;
  let endorsements = [...db.endorsements];
  if (clientId) endorsements = endorsements.filter((e) => e.clientId === clientId);
  endorsements.sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
  res.json(endorsements);
});

router.post("/", async (req, res) => {
  const { clientId, templateId, title, farReference, instructorName, dateGiven, notes } = req.body ?? {};
  if (!clientId || !dateGiven) {
    return res.status(400).json({ error: "clientId and dateGiven are required" });
  }
  const db = await readDatabase();
  if (!db.clients.some((c) => c.id === clientId)) {
    return res.status(400).json({ error: "clientId must reference a valid client" });
  }

  const template = templateId ? ENDORSEMENT_TEMPLATES.find((t) => t.id === templateId) : undefined;
  if (templateId && !template) {
    return res.status(400).json({ error: "templateId does not match a known endorsement template" });
  }
  const resolvedTitle = template ? template.title : title;
  const resolvedFar = template ? template.farReference : farReference;
  if (!resolvedTitle || !String(resolvedTitle).trim()) {
    return res.status(400).json({ error: "title is required for a custom endorsement" });
  }

  const now = new Date().toISOString();
  const endorsement: EndorsementRecord = {
    id: uuidv4(),
    clientId,
    templateId: template ? template.id : null,
    title: String(resolvedTitle).trim(),
    farReference: resolvedFar ?? "",
    instructorName: instructorName ?? "",
    dateGiven: String(dateGiven),
    expiresOn: template?.expirationDays ? addDays(String(dateGiven), template.expirationDays) : null,
    notes: notes ?? "",
    createdAt: now,
  };
  db.endorsements.push(endorsement);
  await writeDatabase(db);
  res.status(201).json(endorsement);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const endorsement = db.endorsements.find((e) => e.id === req.params.id);
  if (!endorsement) return res.status(404).json({ error: "Endorsement not found" });

  const { instructorName, dateGiven, notes, title, farReference } = req.body ?? {};
  if (instructorName !== undefined) {
    endorsement.instructorName = String(instructorName);
  }
  if (dateGiven !== undefined) {
    endorsement.dateGiven = String(dateGiven);
    const template = endorsement.templateId ? ENDORSEMENT_TEMPLATES.find((t) => t.id === endorsement.templateId) : undefined;
    endorsement.expiresOn = template?.expirationDays ? addDays(String(dateGiven), template.expirationDays) : endorsement.expiresOn;
  }
  if (notes !== undefined) endorsement.notes = String(notes);
  if (!endorsement.templateId && title !== undefined) endorsement.title = String(title);
  if (!endorsement.templateId && farReference !== undefined) endorsement.farReference = String(farReference);

  await writeDatabase(db);
  res.json(endorsement);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const endorsement = db.endorsements.find((e) => e.id === req.params.id);
  if (!endorsement) return res.status(404).json({ error: "Endorsement not found" });

  db.endorsements = db.endorsements.filter((e) => e.id !== endorsement.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
