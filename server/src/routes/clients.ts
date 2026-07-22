import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { fullName, readDatabase, writeDatabase } from "../db.js";
import type { Client } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.clients].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const { firstName, lastName, phone, email, street, city, state, zip } = req.body ?? {};
  if (!firstName || !String(firstName).trim()) {
    return res.status(400).json({ error: "firstName is required" });
  }
  const db = await readDatabase();
  const client: Client = {
    id: uuidv4(),
    firstName: String(firstName).trim(),
    lastName: lastName ? String(lastName).trim() : "",
    phone: phone ?? "",
    email: email ?? "",
    street: street ?? "",
    city: city ?? "",
    state: state ?? "",
    zip: zip ?? "",
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

  const { firstName, lastName, phone, email, street, city, state, zip } = req.body ?? {};
  if (firstName !== undefined) {
    if (!String(firstName).trim()) return res.status(400).json({ error: "firstName cannot be empty" });
    client.firstName = String(firstName).trim();
  }
  if (lastName !== undefined) client.lastName = String(lastName).trim();
  if (phone !== undefined) client.phone = String(phone);
  if (email !== undefined) client.email = String(email);
  if (street !== undefined) client.street = String(street);
  if (city !== undefined) client.city = String(city);
  if (state !== undefined) client.state = String(state);
  if (zip !== undefined) client.zip = String(zip);

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
