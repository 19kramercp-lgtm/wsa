import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { inferCashFlowCategory, readDatabase, writeDatabase } from "../db.js";
import type { Account, CashFlowCategory } from "../types.js";

const router = Router();

const VALID_CASH_FLOW_CATEGORIES: CashFlowCategory[] = ["operating", "investing", "financing"];

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.accounts].sort((a, b) => a.code.localeCompare(b.code));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const { code, name, type, normalBalance, description, cashFlowCategory } = req.body ?? {};
  if (!code || !name || !type || !normalBalance) {
    return res.status(400).json({ error: "code, name, type, and normalBalance are required" });
  }
  const db = await readDatabase();
  if (db.accounts.some((a) => a.code === code)) {
    return res.status(409).json({ error: `Account code ${code} already exists` });
  }
  const account: Account = {
    id: uuidv4(),
    code: String(code),
    name: String(name),
    type,
    normalBalance,
    description: description ?? "",
    active: true,
    isSystem: false,
    createdAt: new Date().toISOString(),
    cashFlowCategory: VALID_CASH_FLOW_CATEGORIES.includes(cashFlowCategory)
      ? cashFlowCategory
      : inferCashFlowCategory({ type, name }),
  };
  db.accounts.push(account);
  await writeDatabase(db);
  res.status(201).json(account);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const account = db.accounts.find((a) => a.id === req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const { code, name, description, active, cashFlowCategory } = req.body ?? {};
  if (code && code !== account.code && db.accounts.some((a) => a.code === code && a.id !== account.id)) {
    return res.status(409).json({ error: `Account code ${code} already exists` });
  }
  if (code !== undefined) account.code = String(code);
  if (name !== undefined) account.name = String(name);
  if (description !== undefined) account.description = String(description);
  if (active !== undefined) account.active = Boolean(active);
  if (cashFlowCategory !== undefined && VALID_CASH_FLOW_CATEGORIES.includes(cashFlowCategory)) {
    account.cashFlowCategory = cashFlowCategory;
  }

  await writeDatabase(db);
  res.json(account);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const account = db.accounts.find((a) => a.id === req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });

  const inUse = db.journalEntries.some((je) => je.lines.some((l) => l.accountId === account.id));
  if (inUse) {
    return res.status(409).json({
      error: "This account has transactions posted against it and cannot be deleted. Deactivate it instead.",
    });
  }

  db.accounts = db.accounts.filter((a) => a.id !== account.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
