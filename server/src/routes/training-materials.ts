import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { CertificateTrack, TrainingMaterial } from "../types.js";

const router = Router();

const CATEGORIES: CertificateTrack[] = ["private", "instrument", "commercial", "cfi"];

router.get("/", async (req, res) => {
  const db = await readDatabase();
  const { category } = req.query;
  let materials = [...db.trainingMaterials];
  if (category) materials = materials.filter((m) => m.category === category);
  materials.sort((a, b) => a.title.localeCompare(b.title));
  res.json(materials);
});

router.post("/", async (req, res) => {
  const { title, category, description, url } = req.body ?? {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Category must be private, instrument, commercial, or cfi" });
  }

  const db = await readDatabase();
  const now = new Date().toISOString();
  const material: TrainingMaterial = {
    id: uuidv4(),
    title: String(title).trim(),
    category,
    description: description ?? "",
    url: url ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.trainingMaterials.push(material);
  await writeDatabase(db);
  res.status(201).json(material);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const material = db.trainingMaterials.find((m) => m.id === req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });

  const { title, category, description, url } = req.body ?? {};
  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ error: "Title cannot be empty" });
    material.title = String(title).trim();
  }
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Category must be private, instrument, commercial, or cfi" });
    }
    material.category = category;
  }
  if (description !== undefined) material.description = String(description);
  if (url !== undefined) material.url = String(url);
  material.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  res.json(material);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const material = db.trainingMaterials.find((m) => m.id === req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });

  db.trainingMaterials = db.trainingMaterials.filter((m) => m.id !== material.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
