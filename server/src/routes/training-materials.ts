import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase, UPLOADS_DIR } from "../db.js";
import type { CertificateTrack, TrainingMaterial } from "../types.js";

const router = Router();

const CATEGORIES: CertificateTrack[] = ["private", "instrument", "commercial", "cfi"];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function sanitize(material: TrainingMaterial): Omit<TrainingMaterial, "storedFileName"> {
  const { storedFileName: _storedFileName, ...safe } = material;
  return safe;
}

async function deleteStoredFile(storedFileName: string | null): Promise<void> {
  if (!storedFileName) return;
  try {
    await fs.unlink(path.join(UPLOADS_DIR, storedFileName));
  } catch {
    // already gone — nothing to clean up
  }
}

router.get("/", async (req, res) => {
  const db = await readDatabase();
  const { category } = req.query;
  let materials = [...db.trainingMaterials];
  if (category) materials = materials.filter((m) => m.category === category);
  materials.sort((a, b) => a.title.localeCompare(b.title));
  res.json(materials.map(sanitize));
});

router.get("/:id/file", async (req, res) => {
  const db = await readDatabase();
  const material = db.trainingMaterials.find((m) => m.id === req.params.id);
  if (!material || !material.storedFileName) return res.status(404).json({ error: "No file attached" });

  const filePath = path.join(UPLOADS_DIR, material.storedFileName);
  res.download(filePath, material.fileName ?? material.storedFileName, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "File not found" });
  });
});

router.post("/", upload.single("file"), async (req, res) => {
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
    fileName: req.file?.originalname ?? null,
    storedFileName: req.file?.filename ?? null,
    fileMimeType: req.file?.mimetype ?? null,
    fileSize: req.file?.size ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.trainingMaterials.push(material);
  await writeDatabase(db);
  res.status(201).json(sanitize(material));
});

router.put("/:id", upload.single("file"), async (req, res) => {
  const db = await readDatabase();
  const material = db.trainingMaterials.find((m) => m.id === req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });

  const { title, category, description, url, removeFile } = req.body ?? {};
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

  if (req.file) {
    await deleteStoredFile(material.storedFileName);
    material.fileName = req.file.originalname;
    material.storedFileName = req.file.filename;
    material.fileMimeType = req.file.mimetype;
    material.fileSize = req.file.size;
  } else if (removeFile === "true") {
    await deleteStoredFile(material.storedFileName);
    material.fileName = null;
    material.storedFileName = null;
    material.fileMimeType = null;
    material.fileSize = null;
  }
  material.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  res.json(sanitize(material));
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const material = db.trainingMaterials.find((m) => m.id === req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });

  await deleteStoredFile(material.storedFileName);
  db.trainingMaterials = db.trainingMaterials.filter((m) => m.id !== material.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
