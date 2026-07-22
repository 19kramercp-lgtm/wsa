import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { processDueRecurring, readDatabase, writeDatabase } from "../db.js";
import type { RecurringFrequency, RecurringTransaction, RecurringType } from "../types.js";

const router = Router();

const VALID_FREQUENCIES: RecurringFrequency[] = ["weekly", "monthly", "yearly"];
const VALID_TYPES: RecurringType[] = ["revenue", "expense"];

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.recurringTransactions].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const {
    type,
    description,
    amount,
    frequency,
    startDate,
    endDate,
    revenueAccountId,
    depositAccountId,
    clientId,
    expenseAccountId,
    paymentAccountId,
    vendorId,
  } = req.body ?? {};

  const amt = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: "type must be 'revenue' or 'expense'" });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: "description is required" });
  }
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (!VALID_FREQUENCIES.includes(frequency)) {
    return res.status(400).json({ error: "frequency must be 'weekly', 'monthly', or 'yearly'" });
  }
  if (!startDate) {
    return res.status(400).json({ error: "startDate is required" });
  }

  const db = await readDatabase();

  if (type === "revenue") {
    const revenueAccount = db.accounts.find((a) => a.id === revenueAccountId);
    const depositAccount = db.accounts.find((a) => a.id === depositAccountId);
    const client = db.clients.find((c) => c.id === clientId);
    if (!revenueAccount || revenueAccount.type !== "revenue") {
      return res.status(400).json({ error: "revenueAccountId must reference a revenue account" });
    }
    if (!depositAccount) {
      return res.status(400).json({ error: "depositAccountId must reference a valid account" });
    }
    if (!client) {
      return res.status(400).json({ error: "clientId must reference a valid client" });
    }
  } else {
    const expenseAccount = db.accounts.find((a) => a.id === expenseAccountId);
    const paymentAccount = db.accounts.find((a) => a.id === paymentAccountId);
    const vendor = db.vendors.find((v) => v.id === vendorId);
    if (!expenseAccount || expenseAccount.type !== "expense") {
      return res.status(400).json({ error: "expenseAccountId must reference an expense account" });
    }
    if (!paymentAccount) {
      return res.status(400).json({ error: "paymentAccountId must reference a valid account" });
    }
    if (!vendor) {
      return res.status(400).json({ error: "vendorId must reference a valid vendor" });
    }
  }

  const recurring: RecurringTransaction = {
    id: uuidv4(),
    type,
    description: String(description).trim(),
    amount: amt,
    frequency,
    startDate: String(startDate),
    nextRunDate: String(startDate),
    endDate: endDate || null,
    active: true,
    revenueAccountId: type === "revenue" ? revenueAccountId : null,
    depositAccountId: type === "revenue" ? depositAccountId : null,
    clientId: type === "revenue" ? clientId : null,
    expenseAccountId: type === "expense" ? expenseAccountId : null,
    paymentAccountId: type === "expense" ? paymentAccountId : null,
    vendorId: type === "expense" ? vendorId : null,
    lastRunDate: null,
    createdAt: new Date().toISOString(),
  };
  db.recurringTransactions.push(recurring);
  processDueRecurring(db);
  await writeDatabase(db);
  res.status(201).json(recurring);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const recurring = db.recurringTransactions.find((r) => r.id === req.params.id);
  if (!recurring) return res.status(404).json({ error: "Recurring transaction not found" });

  const {
    description,
    amount,
    frequency,
    endDate,
    active,
    revenueAccountId,
    depositAccountId,
    clientId,
    expenseAccountId,
    paymentAccountId,
    vendorId,
  } = req.body ?? {};

  if (description !== undefined) {
    if (!String(description).trim()) return res.status(400).json({ error: "description cannot be empty" });
    recurring.description = String(description).trim();
  }
  if (amount !== undefined) {
    const amt = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
    if (!amt || amt <= 0) return res.status(400).json({ error: "amount must be a positive number" });
    recurring.amount = amt;
  }
  if (frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ error: "frequency must be 'weekly', 'monthly', or 'yearly'" });
    }
    recurring.frequency = frequency;
  }
  if (endDate !== undefined) recurring.endDate = endDate || null;
  if (active !== undefined) recurring.active = Boolean(active);

  if (recurring.type === "revenue") {
    if (revenueAccountId !== undefined) {
      const account = db.accounts.find((a) => a.id === revenueAccountId);
      if (!account || account.type !== "revenue") {
        return res.status(400).json({ error: "revenueAccountId must reference a revenue account" });
      }
      recurring.revenueAccountId = revenueAccountId;
    }
    if (depositAccountId !== undefined) {
      if (!db.accounts.some((a) => a.id === depositAccountId)) {
        return res.status(400).json({ error: "depositAccountId must reference a valid account" });
      }
      recurring.depositAccountId = depositAccountId;
    }
    if (clientId !== undefined) {
      if (!db.clients.some((c) => c.id === clientId)) {
        return res.status(400).json({ error: "clientId must reference a valid client" });
      }
      recurring.clientId = clientId;
    }
  } else {
    if (expenseAccountId !== undefined) {
      const account = db.accounts.find((a) => a.id === expenseAccountId);
      if (!account || account.type !== "expense") {
        return res.status(400).json({ error: "expenseAccountId must reference an expense account" });
      }
      recurring.expenseAccountId = expenseAccountId;
    }
    if (paymentAccountId !== undefined) {
      if (!db.accounts.some((a) => a.id === paymentAccountId)) {
        return res.status(400).json({ error: "paymentAccountId must reference a valid account" });
      }
      recurring.paymentAccountId = paymentAccountId;
    }
    if (vendorId !== undefined) {
      if (!db.vendors.some((v) => v.id === vendorId)) {
        return res.status(400).json({ error: "vendorId must reference a valid vendor" });
      }
      recurring.vendorId = vendorId;
    }
  }

  await writeDatabase(db);
  res.json(recurring);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const exists = db.recurringTransactions.some((r) => r.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Recurring transaction not found" });
  db.recurringTransactions = db.recurringTransactions.filter((r) => r.id !== req.params.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
