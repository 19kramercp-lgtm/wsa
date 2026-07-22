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
