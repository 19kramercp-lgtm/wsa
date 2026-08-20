import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { readDatabase, writeDatabase } from "../db.js";
import type { CommodityOptionType, CommodityTrade, TradeSide } from "../types.js";

const router = Router();

const VALID_OPTION_TYPES: CommodityOptionType[] = ["call", "put"];
const VALID_SIDES: TradeSide[] = ["long", "short"];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function validate(body: Record<string, unknown>): { error: string } | null {
  if (!body.commodity || !String(body.commodity).trim()) return { error: "commodity is required" };
  if (!VALID_OPTION_TYPES.includes(body.optionType as CommodityOptionType)) {
    return { error: "optionType must be 'call' or 'put'" };
  }
  if (!VALID_SIDES.includes(body.side as TradeSide)) {
    return { error: "side must be 'long' or 'short'" };
  }
  if (!(Number(body.strikePrice) > 0)) return { error: "strikePrice must be a positive number" };
  if (!body.expirationDate) return { error: "expirationDate is required" };
  if (!(Number(body.contracts) > 0)) return { error: "contracts must be a positive number" };
  if (!body.entryDate) return { error: "entryDate is required" };
  if (!(Number(body.entryPrice) >= 0)) return { error: "entryPrice must be zero or a positive number" };
  const hasExitPrice = body.exitPrice !== undefined && body.exitPrice !== null && body.exitPrice !== "";
  const hasExitDate = body.exitDate !== undefined && body.exitDate !== null && body.exitDate !== "";
  if (hasExitPrice !== hasExitDate) {
    return { error: "exitPrice and exitDate must be provided together" };
  }
  if (hasExitPrice && !(Number(body.exitPrice) >= 0)) {
    return { error: "exitPrice must be zero or a positive number" };
  }
  return null;
}

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const sorted = [...db.commodityTrades].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  res.json(sorted);
});

router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const error = validate(body);
  if (error) return res.status(400).json(error);

  const db = await readDatabase();
  const now = new Date().toISOString();
  const trade: CommodityTrade = {
    id: uuidv4(),
    commodity: String(body.commodity).trim(),
    optionType: body.optionType,
    side: body.side,
    strikePrice: round2(Number(body.strikePrice)),
    expirationDate: String(body.expirationDate),
    contracts: Number(body.contracts),
    multiplier: Number(body.multiplier) > 0 ? Number(body.multiplier) : 100,
    entryPrice: round2(Number(body.entryPrice)),
    entryDate: String(body.entryDate),
    exitPrice: body.exitPrice !== undefined && body.exitPrice !== null && body.exitPrice !== "" ? round2(Number(body.exitPrice)) : null,
    exitDate: body.exitDate || null,
    notes: body.notes ? String(body.notes) : "",
    createdAt: now,
    updatedAt: now,
  };
  db.commodityTrades.push(trade);
  await writeDatabase(db);
  res.status(201).json(trade);
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const trade = db.commodityTrades.find((t) => t.id === req.params.id);
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const body = req.body ?? {};
  const merged = {
    commodity: body.commodity ?? trade.commodity,
    optionType: body.optionType ?? trade.optionType,
    side: body.side ?? trade.side,
    strikePrice: body.strikePrice ?? trade.strikePrice,
    expirationDate: body.expirationDate ?? trade.expirationDate,
    contracts: body.contracts ?? trade.contracts,
    multiplier: body.multiplier ?? trade.multiplier,
    entryPrice: body.entryPrice ?? trade.entryPrice,
    entryDate: body.entryDate ?? trade.entryDate,
    exitPrice: body.exitPrice !== undefined ? body.exitPrice : trade.exitPrice,
    exitDate: body.exitDate !== undefined ? body.exitDate : trade.exitDate,
    notes: body.notes,
  };
  const error = validate(merged);
  if (error) return res.status(400).json(error);

  trade.commodity = String(merged.commodity).trim();
  trade.optionType = merged.optionType;
  trade.side = merged.side;
  trade.strikePrice = round2(Number(merged.strikePrice));
  trade.expirationDate = String(merged.expirationDate);
  trade.contracts = Number(merged.contracts);
  trade.multiplier = Number(merged.multiplier) > 0 ? Number(merged.multiplier) : 100;
  trade.entryPrice = round2(Number(merged.entryPrice));
  trade.entryDate = String(merged.entryDate);
  trade.exitPrice =
    merged.exitPrice !== undefined && merged.exitPrice !== null && merged.exitPrice !== ""
      ? round2(Number(merged.exitPrice))
      : null;
  trade.exitDate = merged.exitDate || null;
  if (body.notes !== undefined) trade.notes = String(body.notes);
  trade.updatedAt = new Date().toISOString();

  await writeDatabase(db);
  res.json(trade);
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const exists = db.commodityTrades.some((t) => t.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Trade not found" });
  db.commodityTrades = db.commodityTrades.filter((t) => t.id !== req.params.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
