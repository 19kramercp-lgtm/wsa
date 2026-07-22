import type {
  Account,
  Aircraft,
  AgedPayablesResponse,
  AgedReceivablesResponse,
  BalanceSheetResponse,
  CashFlowResponse,
  Client,
  ClosedPeriod,
  EndorsementRecord,
  EndorsementTemplate,
  Far61Requirement,
  IncomeStatementResponse,
  Instructor,
  JournalEntry,
  LedgerResponse,
  LogbookEntry,
  LogbookTotals,
  RecurringTransaction,
  RevenueByClientResponse,
  StudentRequirementsResponse,
  TrialBalanceResponse,
  Vendor,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  accounts: {
    list: () => request<Account[]>("/accounts"),
    create: (data: Partial<Account>) =>
      request<Account>("/accounts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Account>) =>
      request<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/accounts/${id}`, { method: "DELETE" }),
  },
  journal: {
    list: (params?: { start?: string; end?: string; accountId?: string; source?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<JournalEntry[]>(`/journal-entries${qs ? `?${qs}` : ""}`);
    },
    create: (data: Partial<JournalEntry>) =>
      request<JournalEntry>("/journal-entries", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<JournalEntry>) =>
      request<JournalEntry>(`/journal-entries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/journal-entries/${id}`, { method: "DELETE" }),
  },
  transactions: {
    revenue: (data: {
      date: string;
      description?: string;
      revenueAccountId: string;
      depositAccountId: string;
      amount: number;
      clientId: string;
      reference?: string;
    }) => request<JournalEntry>("/transactions/revenue", { method: "POST", body: JSON.stringify(data) }),
    expense: (data: {
      date: string;
      description?: string;
      expenseAccountId: string;
      paymentAccountId: string;
      amount: number;
      vendorId: string;
      reference?: string;
    }) => request<JournalEntry>("/transactions/expense", { method: "POST", body: JSON.stringify(data) }),
  },
  ledger: {
    get: (accountId: string, params?: { start?: string; end?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<LedgerResponse>(`/ledger/${accountId}${qs ? `?${qs}` : ""}`);
    },
  },
  reports: {
    trialBalance: (asOf?: string) =>
      request<TrialBalanceResponse>(`/reports/trial-balance${asOf ? `?asOf=${asOf}` : ""}`),
    incomeStatement: (start?: string, end?: string) => {
      const qs = new URLSearchParams({ ...(start ? { start } : {}), ...(end ? { end } : {}) }).toString();
      return request<IncomeStatementResponse>(`/reports/income-statement${qs ? `?${qs}` : ""}`);
    },
    balanceSheet: (asOf?: string) =>
      request<BalanceSheetResponse>(`/reports/balance-sheet${asOf ? `?asOf=${asOf}` : ""}`),
    cashFlow: (start?: string, end?: string) => {
      const qs = new URLSearchParams({ ...(start ? { start } : {}), ...(end ? { end } : {}) }).toString();
      return request<CashFlowResponse>(`/reports/cash-flow${qs ? `?${qs}` : ""}`);
    },
    agedReceivables: (asOf?: string) =>
      request<AgedReceivablesResponse>(`/reports/aged-receivables${asOf ? `?asOf=${asOf}` : ""}`),
    agedPayables: (asOf?: string) =>
      request<AgedPayablesResponse>(`/reports/aged-payables${asOf ? `?asOf=${asOf}` : ""}`),
    revenueByClient: (start?: string, end?: string) => {
      const qs = new URLSearchParams({ ...(start ? { start } : {}), ...(end ? { end } : {}) }).toString();
      return request<RevenueByClientResponse>(`/reports/revenue-by-client${qs ? `?${qs}` : ""}`);
    },
  },
  periods: {
    list: () => request<ClosedPeriod[]>("/periods"),
    close: (period: string) =>
      request<ClosedPeriod>("/periods/close", { method: "POST", body: JSON.stringify({ period }) }),
    reopen: (period: string) => request<void>("/periods/reopen", { method: "POST", body: JSON.stringify({ period }) }),
  },
  clients: {
    list: () => request<Client[]>("/clients"),
    create: (data: Partial<Client>) => request<Client>("/clients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) =>
      request<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/clients/${id}`, { method: "DELETE" }),
  },
  vendors: {
    list: () => request<Vendor[]>("/vendors"),
    create: (data: Partial<Vendor>) => request<Vendor>("/vendors", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Vendor>) =>
      request<Vendor>(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/vendors/${id}`, { method: "DELETE" }),
  },
  recurring: {
    list: () => request<RecurringTransaction[]>("/recurring"),
    create: (data: Partial<RecurringTransaction>) =>
      request<RecurringTransaction>("/recurring", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<RecurringTransaction>) =>
      request<RecurringTransaction>(`/recurring/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/recurring/${id}`, { method: "DELETE" }),
  },
  instructors: {
    list: () => request<Instructor[]>("/instructors"),
    create: (data: Partial<Instructor>) =>
      request<Instructor>("/instructors", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Instructor>) =>
      request<Instructor>(`/instructors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/instructors/${id}`, { method: "DELETE" }),
  },
  aircraft: {
    list: () => request<Aircraft[]>("/aircraft"),
    create: (data: Partial<Aircraft>) => request<Aircraft>("/aircraft", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Aircraft>) =>
      request<Aircraft>(`/aircraft/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/aircraft/${id}`, { method: "DELETE" }),
  },
  logbook: {
    list: (params?: { clientId?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<LogbookEntry[]>(`/logbook${qs ? `?${qs}` : ""}`);
    },
    totals: (clientId: string) => request<LogbookTotals>(`/logbook/totals/${clientId}`),
    create: (data: Partial<LogbookEntry>) =>
      request<LogbookEntry>("/logbook", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<LogbookEntry>) =>
      request<LogbookEntry>(`/logbook/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/logbook/${id}`, { method: "DELETE" }),
  },
  endorsements: {
    templates: () => request<EndorsementTemplate[]>("/endorsements/templates"),
    list: (params?: { clientId?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<EndorsementRecord[]>(`/endorsements${qs ? `?${qs}` : ""}`);
    },
    create: (data: Partial<EndorsementRecord>) =>
      request<EndorsementRecord>("/endorsements", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<EndorsementRecord>) =>
      request<EndorsementRecord>(`/endorsements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/endorsements/${id}`, { method: "DELETE" }),
  },
  requirements: {
    definitions: () => request<Far61Requirement[]>("/requirements/definitions"),
    forStudent: (clientId: string) => request<StudentRequirementsResponse>(`/requirements/${clientId}`),
    setCheck: (clientId: string, requirementId: string, data: { met?: boolean; note?: string; dateMet?: string | null }) =>
      request(`/requirements/${clientId}/${requirementId}`, { method: "PUT", body: JSON.stringify(data) }),
  },
};
