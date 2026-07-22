export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type NormalBalance = "debit" | "credit";

export type CashFlowCategory = "operating" | "investing" | "financing";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  description: string;
  active: boolean;
  isSystem: boolean;
  createdAt: string;
  cashFlowCategory: CashFlowCategory;
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

export type JournalSource = "manual" | "revenue" | "expense";

export interface JournalEntry {
  id: string;
  date: string;
  memo: string;
  reference: string;
  source: JournalSource;
  lines: JournalLine[];
  clientId: string | null;
  vendorId: string | null;
  recurringTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClosedPeriod {
  period: string; // "YYYY-MM"
  closedAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  businessName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  createdAt: string;
}

export type RecurringFrequency = "weekly" | "monthly" | "yearly";
export type RecurringType = "revenue" | "expense";

export interface RecurringTransaction {
  id: string;
  type: RecurringType;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  endDate: string | null;
  active: boolean;
  revenueAccountId: string | null;
  depositAccountId: string | null;
  clientId: string | null;
  expenseAccountId: string | null;
  paymentAccountId: string | null;
  vendorId: string | null;
  lastRunDate: string | null;
  createdAt: string;
}

export type CertificateTrack = "private" | "instrument" | "commercial" | "cfi";

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  certificateNumber: string;
  ratings: string;
  certificateExpiration: string | null;
  phone: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  makeModel: string;
  category: string;
  isComplex: boolean;
  isHighPerformance: boolean;
  isTailwheel: boolean;
  active: boolean;
  createdAt: string;
}

export interface LogbookEntry {
  id: string;
  clientId: string;
  date: string;
  aircraftId: string | null;
  instructorId: string | null;
  route: string;
  totalTime: number;
  picTime: number;
  soloTime: number;
  crossCountryTime: number;
  nightTime: number;
  actualInstrumentTime: number;
  simulatedInstrumentTime: number;
  dualReceived: number;
  dayLandings: number;
  nightLandings: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface EndorsementRecord {
  id: string;
  clientId: string;
  templateId: string | null;
  title: string;
  farReference: string;
  instructorId: string | null;
  dateGiven: string;
  expiresOn: string | null;
  notes: string;
  createdAt: string;
}

export interface RequirementCheck {
  id: string;
  clientId: string;
  requirementId: string;
  certificate: CertificateTrack;
  met: boolean;
  note: string;
  dateMet: string | null;
  updatedAt: string;
}

export interface Database {
  accounts: Account[];
  journalEntries: JournalEntry[];
  closedPeriods: ClosedPeriod[];
  clients: Client[];
  vendors: Vendor[];
  recurringTransactions: RecurringTransaction[];
  instructors: Instructor[];
  aircraft: Aircraft[];
  logbookEntries: LogbookEntry[];
  endorsements: EndorsementRecord[];
  requirementChecks: RequirementCheck[];
  meta: {
    nextJournalNumber: number;
  };
}
