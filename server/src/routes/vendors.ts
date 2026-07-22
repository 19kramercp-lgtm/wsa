import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { Vendor } from "../types.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.vendors].sort((a, b) => a.businessName.localeCompare(b.businessName));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const { businessName, phone, email, street, city, state, zip } = req.body ?? {};
  if (!businessName || !String(businessName).trim()) {
    return res.status(400).json({ error: "businessName is required" });
  }
  const db = await readDatabase();
  const vendor: Vendor = {
    id: uuidv4(),
    businessName: String(businessName).trim(),
    phone: phone ?? "",
    email: email ?? "",
    street: street ?? "",
    city: city ?? "",
    state: state ?? "",
    zip: zip ?? "",
    createdAt: new Date().toISOString(),
  };
  db.vendors.push(vendor);
  await writeDatabase(db);
  res.status(201).json(vendor);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const vendor = db.vendors.find((v) => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });

  const { businessName, phone, email, street, city, state, zip } = req.body ?? {};
  if (businessName !== undefined) {
    if (!String(businessName).trim()) return res.status(400).json({ error: "businessName cannot be empty" });
    vendor.businessName = String(businessName).trim();
  }
  if (phone !== undefined) vendor.phone = String(phone);
  if (email !== undefined) vendor.email = String(email);
  if (street !== undefined) vendor.street = String(street);
  if (city !== undefined) vendor.city = String(city);
  if (state !== undefined) vendor.state = String(state);
  if (zip !== undefined) vendor.zip = String(zip);

  await writeDatabase(db);
  res.json(vendor);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const vendor = db.vendors.find((v) => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });

  const inUse = db.journalEntries.some((je) => je.vendorId === vendor.id);
  if (inUse) {
    return res.status(409).json({
      error: "This vendor has transactions on record and cannot be deleted.",
    });
  }

  db.vendors = db.vendors.filter((v) => v.id !== vendor.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
