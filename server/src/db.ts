import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import type { Account, CashFlowCategory, ClosedPeriod, Database } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ? process.env.DATA_DIR : path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "wingspan-ledger.json");

function seedAccounts(): Account[] {
  const now = new Date().toISOString();
  const make = (
    code: string,
    name: string,
    type: Account["type"],
    normalBalance: Account["normalBalance"],
    description = "",
    cashFlowCategory: CashFlowCategory = "operating"
  ): Account => ({
    id: uuidv4(),
    code,
    name,
    type,
    normalBalance,
    description,
    active: true,
    isSystem: true,
    createdAt: now,
    cashFlowCategory,
  });

  return [
    // Assets
    make("1000", "Cash - Operating Account", "asset", "debit", "Primary business checking account"),
    make("1010", "Cash - Savings", "asset", "debit", "Business savings account"),
    make("1020", "Accounts Receivable", "asset", "debit", "Amounts owed by students/clients", "operating"),
    make("1030", "Prepaid Insurance", "asset", "debit", "Insurance paid in advance", "operating"),
    make("1500", "Aircraft", "asset", "debit", "Aircraft owned by the company", "investing"),
    make(
      "1510",
      "Accumulated Depreciation - Aircraft",
      "asset",
      "credit",
      "Contra-asset for aircraft depreciation",
      "investing"
    ),
    make(
      "1600",
      "Flight Equipment & Simulators",
      "asset",
      "debit",
      "Headsets, simulators, training equipment",
      "investing"
    ),
    // Liabilities
    make("2000", "Accounts Payable", "liability", "credit", "Amounts owed to vendors", "operating"),
    make("2010", "Accrued Liabilities", "liability", "credit", "Accrued expenses not yet paid", "operating"),
    make(
      "2020",
      "Unearned Revenue",
      "liability",
      "credit",
      "Prepaid lesson packages / deposits from students",
      "operating"
    ),
    make(
      "2100",
      "Notes Payable - Aircraft Loan",
      "liability",
      "credit",
      "Loan(s) used to finance aircraft",
      "financing"
    ),
    // Equity
    make("3000", "Owner's Equity", "equity", "credit", "Owner capital contributions", "financing"),
    make("3010", "Retained Earnings", "equity", "credit", "Accumulated earnings", "financing"),
    make("3900", "Owner's Draws", "equity", "debit", "Owner withdrawals", "financing"),
    // Revenue
    make("4000", "Flight Instruction Revenue", "revenue", "credit", "Dual flight instruction fees"),
    make("4010", "Ground Instruction Revenue", "revenue", "credit", "Ground school / classroom instruction fees"),
    make("4020", "Aircraft Rental Revenue", "revenue", "credit", "Solo/rental aircraft revenue"),
    make("4030", "Checkride & Exam Fees", "revenue", "credit", "Stage checks, checkride prep, exam proctoring"),
    make("4900", "Other Income", "revenue", "credit", "Miscellaneous income"),
    // Expenses
    make("5000", "Fuel Expense", "expense", "debit", "Avgas and fuel costs"),
    make("5010", "Aircraft Maintenance & Repairs", "expense", "debit", "Scheduled and unscheduled maintenance"),
    make("5020", "Aircraft Insurance", "expense", "debit", "Hull and liability insurance"),
    make("5030", "Hangar & Tie-down Rent", "expense", "debit", "Aircraft storage costs"),
    make("5040", "Instructor Wages", "expense", "debit", "CFI/CFII payroll"),
    make("5050", "Ground School Materials", "expense", "debit", "Training materials, charts, subscriptions"),
    make("5060", "Landing & Airport Fees", "expense", "debit", "Landing fees, ramp fees"),
    make("5070", "Advertising & Marketing", "expense", "debit", "Promotion and student recruitment"),
    make("5080", "Office Supplies", "expense", "debit", "General office supplies"),
    make("5090", "Software Subscriptions", "expense", "debit", "Scheduling, logbook, and other software"),
    make("5100", "Depreciation Expense", "expense", "debit", "Depreciation of aircraft and equipment"),
    make("5900", "Miscellaneous Expense", "expense", "debit", "Uncategorized expenses"),
  ];
}

function defaultDatabase(): Database {
  return {
    accounts: seedAccounts(),
    journalEntries: [],
    closedPeriods: [],
    meta: { nextJournalNumber: 1 },
  };
}

export function inferCashFlowCategory(account: Pick<Account, "type" | "name">): CashFlowCategory {
  if (account.type === "revenue" || account.type === "expense") return "operating";
  if (account.type === "equity") return "financing";
  if (account.type === "liability") {
    return /notes payable|loan/i.test(account.name) ? "financing" : "operating";
  }
  // asset
  return /aircraft|equipment|simulator|depreciation|vehicle|building/i.test(account.name) ? "investing" : "operating";
}

function migrate(db: Database): Database {
  if (!db.closedPeriods) db.closedPeriods = [];
  for (const account of db.accounts) {
    if (!account.cashFlowCategory) {
      account.cashFlowCategory = inferCashFlowCategory(account);
    }
  }
  return db;
}

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultDatabase(), null, 2), "utf-8");
  }
}

export async function readDatabase(): Promise<Database> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return migrate(JSON.parse(raw) as Database);
}

export async function writeDatabase(db: Database): Promise<void> {
  const task = writeQueue.then(async () => {
    const tmpFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(db, null, 2), "utf-8");
    await fs.rename(tmpFile, DATA_FILE);
  });
  writeQueue = task.catch(() => undefined);
  return task;
}

export function isPeriodClosed(date: string, closedPeriods: ClosedPeriod[]): boolean {
  const period = date.slice(0, 7);
  return closedPeriods.some((cp) => cp.period === period);
}

export { DATA_FILE };
