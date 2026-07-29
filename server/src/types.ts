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
  fileName: string | null; // original filename shown to users
  storedFileName: string | null; // name on disk under data/uploads — internal only
  fileMimeType: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarSessionType = "flight" | "ground";

export interface Aircraft {
  id: string;
  tailNumber: string; // e.g. "N12345"
  make: string;
  model: string;
  category: string; // e.g. "Airplane"
  class: string; // e.g. "Single-Engine Land"
  complex: boolean;
  highPerformance: boolean;
  tailwheel: boolean;
  active: boolean;
  // Weight & Balance
  emptyWeight: number | null; // lbs
  emptyWeightCG: number | null; // in
  usefulLoad: number | null; // lbs
  maxGrossWeight: number | null; // lbs
  cgRangeForward: number | null; // in
  cgRangeAft: number | null; // in
  // Airplane Details
  engine: string;
  horsepower: number | null;
  fuelCapacity: number | null; // gal, total
  usableFuel: number | null; // gal
  oilCapacity: number | null; // qt
  cruiseSpeed: number | null; // kts
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string; // e.g. "Briefing Room A"
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  sessionType: CalendarSessionType;
  aircraftId: string | null;
  classroomId: string | null;
  studentClientId: string;
  instructorName: string;
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
  aircraft: Aircraft[];
  classrooms: Classroom[];
  meta: {
    nextJournalNumber: number;
    authSecret: string;
  };
}
