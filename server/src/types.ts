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

export interface EndorsementRecord {
  id: string;
  clientId: string;
  templateId: string | null;
  title: string;
  farReference: string;
  instructorName: string;
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

export type UserRole = "administrator" | "instructor" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  clientId: string | null;
  createdAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface TrainingMaterial {
  id: string;
  title: string;
  category: CertificateTrack;
  description: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM, optional
  endTime: string; // HH:MM, optional
  studentClientId: string | null;
  instructorName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  accounts: Account[];
  journalEntries: JournalEntry[];
  closedPeriods: ClosedPeriod[];
  clients: Client[];
  vendors: Vendor[];
  recurringTransactions: RecurringTransaction[];
  endorsements: EndorsementRecord[];
  requirementChecks: RequirementCheck[];
  users: User[];
  trainingMaterials: TrainingMaterial[];
  calendarEvents: CalendarEvent[];
  meta: {
    nextJournalNumber: number;
    authSecret: string;
  };
}
