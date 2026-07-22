import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { Client } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.clients].sort((a, b) => a.name.localeCompare(b.name));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const { name, phone, email, address } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const db = await readDatabase();
  const client: Client = {
    id: uuidv4(),
    name: String(name).trim(),
    phone: phone ?? "",
    email: email ?? "",
    address: address ?? "",
    createdAt: new Date().toISOString(),
  };
  db.clients.push(client);
  await writeDatabase(db);
  res.status(201).json(client);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const { name, phone, email, address } = req.body ?? {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: "name cannot be empty" });
    client.name = String(name).trim();
  }
  if (phone !== undefined) client.phone = String(phone);
  if (email !== undefined) client.email = String(email);
  if (address !== undefined) client.address = String(address);

  await writeDatabase(db);
  res.json(client);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const inUse = db.journalEntries.some((je) => je.clientId === client.id);
  if (inUse) {
    return res.status(409).json({
      error: "This client has transactions on record and cannot be deleted.",
    });
  }

  db.clients = db.clients.filter((c) => c.id !== client.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
