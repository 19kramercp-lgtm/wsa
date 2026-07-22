export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type NormalBalance = "debit" | "credit";

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
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  accounts: Account[];
  journalEntries: JournalEntry[];
  meta: {
    nextJournalNumber: number;
  };
}
