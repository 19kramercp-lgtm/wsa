import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "./password.js";
import type { Account, CashFlowCategory, ClosedPeriod, Database, JournalEntry, RecurringFrequency, User } from "./types.js";

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

// Seeds a single administrator account so the app is usable on first run.
// The password is deliberately simple and meant to be changed immediately
// after the first login (there's a "Change Password" option once signed in).
function seedUsers(): User[] {
  return [
    {
      id: uuidv4(),
      name: "Administrator",
      email: "admin@wingspanaviation.test",
      passwordHash: hashPassword("wingspan-admin"),
      role: "administrator",
      clientId: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

function defaultDatabase(): Database {
  return {
    accounts: seedAccounts(),
    journalEntries: [],
    closedPeriods: [],
    clients: [],
    vendors: [],
    recurringTransactions: [],
    endorsements: [],
    requirementChecks: [],
    users: seedUsers(),
    trainingMaterials: [],
    calendarEvents: [],
    meta: { nextJournalNumber: 1, authSecret: crypto.randomBytes(32).toString("hex") },
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
  if (!db.clients) db.clients = [];
  if (!db.vendors) db.vendors = [];
  if (!db.recurringTransactions) db.recurringTransactions = [];
  if (!db.endorsements) db.endorsements = [];
  if (!db.requirementChecks) db.requirementChecks = [];
  if (!db.users || db.users.length === 0) db.users = seedUsers();
  if (!db.trainingMaterials) db.trainingMaterials = [];
  if (!db.calendarEvents) db.calendarEvents = [];
  if (!db.meta.authSecret) db.meta.authSecret = crypto.randomBytes(32).toString("hex");
  for (const endorsement of db.endorsements as unknown as Record<string, unknown>[]) {
    if (typeof endorsement.instructorName !== "string") endorsement.instructorName = "";
    delete endorsement.instructorId;
  }
  for (const account of db.accounts) {
    if (!account.cashFlowCategory) {
      account.cashFlowCategory = inferCashFlowCategory(account);
    }
  }
  for (const entry of db.journalEntries as unknown as Record<string, unknown>[]) {
    if (entry.clientId === undefined) entry.clientId = null;
    if (entry.vendorId === undefined) entry.vendorId = null;
    if (entry.recurringTransactionId === undefined) entry.recurringTransactionId = null;
  }
  for (const client of db.clients as unknown as Record<string, unknown>[]) {
    if (typeof client.firstName !== "string") {
      const legacyName = typeof client.name === "string" ? client.name.trim() : "";
      const spaceIndex = legacyName.indexOf(" ");
      client.firstName = spaceIndex === -1 ? legacyName : legacyName.slice(0, spaceIndex);
      client.lastName = spaceIndex === -1 ? "" : legacyName.slice(spaceIndex + 1);
      delete client.name;
    }
    if (typeof client.street !== "string") {
      client.street = typeof client.address === "string" ? client.address : "";
      client.city = "";
      client.state = "";
      client.zip = "";
      delete client.address;
    }
  }
  return db;
}

export function addInterval(dateISO: string, frequency: RecurringFrequency): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  if (frequency === "weekly") {
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 7);
    return date.toISOString().slice(0, 10);
  }
  if (frequency === "monthly") {
    let newMonth = m + 1;
    let newYear = y;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const lastDay = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  // yearly
  const newYear = y + 1;
  const lastDay = new Date(Date.UTC(newYear, m, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${newYear}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Generates any journal entries that are due for active recurring
// transactions, catching up on however many occurrences have passed since
// the app was last opened. Returns whether anything changed so callers know
// whether to persist. Occurrences that would land in a closed period are
// skipped (but still advance nextRunDate) so one blocked month doesn't
// stall all future occurrences.
export function processDueRecurring(db: Database): { created: number } {
  const todayStr = new Date().toISOString().slice(0, 10);
  let created = 0;

  for (const rt of db.recurringTransactions) {
    if (!rt.active) continue;
    let guard = 0;
    while (rt.nextRunDate <= todayStr && (!rt.endDate || rt.nextRunDate <= rt.endDate) && guard < 1000) {
      guard++;
      const occurrenceDate = rt.nextRunDate;
      const isClosed = isPeriodClosed(occurrenceDate, db.closedPeriods);

      if (!isClosed) {
        const now = new Date().toISOString();
        const memo = `${rt.description} (Recurring)`;
        let entry: JournalEntry | null = null;

        if (rt.type === "revenue" && rt.revenueAccountId && rt.depositAccountId) {
          entry = {
            id: uuidv4(),
            date: occurrenceDate,
            memo,
            reference: String(db.meta.nextJournalNumber).padStart(5, "0"),
            source: "revenue",
            clientId: rt.clientId,
            vendorId: null,
            recurringTransactionId: rt.id,
            lines: [
              { id: uuidv4(), accountId: rt.depositAccountId, debit: rt.amount, credit: 0, description: memo },
              { id: uuidv4(), accountId: rt.revenueAccountId, debit: 0, credit: rt.amount, description: memo },
            ],
            createdAt: now,
            updatedAt: now,
          };
        } else if (rt.type === "expense" && rt.expenseAccountId && rt.paymentAccountId) {
          entry = {
            id: uuidv4(),
            date: occurrenceDate,
            memo,
            reference: String(db.meta.nextJournalNumber).padStart(5, "0"),
            source: "expense",
            clientId: null,
            vendorId: rt.vendorId,
            recurringTransactionId: rt.id,
            lines: [
              { id: uuidv4(), accountId: rt.expenseAccountId, debit: rt.amount, credit: 0, description: memo },
              { id: uuidv4(), accountId: rt.paymentAccountId, debit: 0, credit: rt.amount, description: memo },
            ],
            createdAt: now,
            updatedAt: now,
          };
        }

        if (entry) {
          db.meta.nextJournalNumber += 1;
          db.journalEntries.push(entry);
          rt.lastRunDate = occurrenceDate;
          created++;
        }
      }

      rt.nextRunDate = addInterval(rt.nextRunDate, rt.frequency);
    }
  }

  return { created };
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
  const db = migrate(JSON.parse(raw) as Database);
  const { created } = processDueRecurring(db);
  if (created > 0) {
    await writeDatabase(db);
  }
  return db;
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

export function fullName(client: { firstName: string; lastName: string }): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

export { DATA_FILE };
