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

export interface LedgerRow {
  journalEntryId: string;
  date: string;
  reference: string;
  memo: string;
  source: JournalSource;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerResponse {
  account: Account;
  rows: LedgerRow[];
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
}

export interface TrialBalanceResponse {
  asOf: string | null;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface IncomeStatementRow {
  account: Account;
  amount: number;
}

export interface IncomeStatementResponse {
  start: string | null;
  end: string | null;
  revenueRows: IncomeStatementRow[];
  expenseRows: IncomeStatementRow[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheetResponse {
  asOf: string | null;
  assetRows: IncomeStatementRow[];
  liabilityRows: IncomeStatementRow[];
  equityRows: IncomeStatementRow[];
  netIncomeToDate: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export interface CashFlowRow {
  account: Account;
  amount: number;
}

export interface CashFlowResponse {
  start: string | null;
  end: string | null;
  operatingRows: CashFlowRow[];
  investingRows: CashFlowRow[];
  financingRows: CashFlowRow[];
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  netChangeInCash: number;
  beginningCash: number;
  endingCash: number;
  reconciled: boolean;
}

export interface ClosedPeriod {
  period: string;
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

export interface AgedReceivableRow {
  client: Client;
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgedReceivablesResponse {
  asOf: string;
  rows: AgedReceivableRow[];
  totals: {
    current: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  };
}

export interface AgedPayableRow {
  vendor: Vendor;
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgedPayablesResponse {
  asOf: string;
  rows: AgedPayableRow[];
  totals: {
    current: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  };
}

export interface RevenueByClientRow {
  client: Client | null;
  amount: number;
}

export interface RevenueByClientResponse {
  start: string | null;
  end: string | null;
  rows: RevenueByClientRow[];
  totalRevenue: number;
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

export interface EndorsementTemplate {
  id: string;
  title: string;
  farReference: string;
  certificate: CertificateTrack | "general";
  expirationDays?: number;
}

export interface Far61Requirement {
  id: string;
  certificate: CertificateTrack;
  reg: string;
  text: string;
  targetHours?: number;
  targetCount?: number;
}

export interface Far61RequirementStatus extends Far61Requirement {
  met: boolean;
  note: string;
  dateMet: string | null;
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

export interface StudentRequirementsResponse {
  clientId: string;
  byCertificate: { certificate: CertificateTrack; requirements: Far61RequirementStatus[] }[];
}
