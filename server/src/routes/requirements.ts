import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import { FAR61_REQUIREMENTS } from "../reference.js";
import { computeLogbookTotals } from "./logbook.js";
import type { CertificateTrack } from "../types.js";

const router = Router();

const CERTIFICATE_TRACKS: CertificateTrack[] = ["private", "instrument", "commercial", "cfi"];

router.get("/definitions", (_req, res) => {
  res.json(FAR61_REQUIREMENTS);
});

// Merged view for one student: every FAR 61 requirement grouped by
// certificate, each paired with its saved checkbox state (defaulting to
// unmet), plus the student's live logbook totals for reference.
router.get("/:clientId", async (req, res) => {
  const db = await readDatabase();
  const client = db.clients.find((c) => c.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const checksByRequirement = new Map(
    db.requirementChecks.filter((rc) => rc.clientId === client.id).map((rc) => [rc.requirementId, rc])
  );

  const byCertificate = CERTIFICATE_TRACKS.map((certificate) => ({
    certificate,
    requirements: FAR61_REQUIREMENTS.filter((r) => r.certificate === certificate).map((r) => {
      const check = checksByRequirement.get(r.id);
      return {
        ...r,
        met: check?.met ?? false,
        note: check?.note ?? "",
        dateMet: check?.dateMet ?? null,
      };
    }),
  }));

  const totals = computeLogbookTotals(db.logbookEntries.filter((e) => e.clientId === client.id));

  res.json({ clientId: client.id, byCertificate, totals });
});

router.put("/:clientId/:requirementId", async (req, res) => {
  const db = await readDatabase();
  const client = db.clients.find((c) => c.id === req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const requirement = FAR61_REQUIREMENTS.find((r) => r.id === req.params.requirementId);
  if (!requirement) return res.status(404).json({ error: "Requirement not found" });

  const { met, note, dateMet } = req.body ?? {};
  let check = db.requirementChecks.find((rc) => rc.clientId === client.id && rc.requirementId === requirement.id);
  const now = new Date().toISOString();
  if (!check) {
    check = {
      id: uuidv4(),
      clientId: client.id,
      requirementId: requirement.id,
      certificate: requirement.certificate,
      met: false,
      note: "",
      dateMet: null,
      updatedAt: now,
    };
    db.requirementChecks.push(check);
  }
  if (met !== undefined) check.met = Boolean(met);
  if (note !== undefined) check.note = String(note);
  if (dateMet !== undefined) check.dateMet = dateMet || null;
  check.updatedAt = now;

  await writeDatabase(db);
  res.json(check);
});

export default router;
