import type {
  Account,
  ActivityEntry,
  AgedPayablesResponse,
  AgedReceivablesResponse,
  Aircraft,
  BalanceSheetResponse,
  CalendarEvent,
  CashFlowResponse,
  Classroom,
  Client,
  ClosedPeriod,
  CommodityTrade,
  EndorsementRecord,
  EndorsementTemplate,
  Far61Requirement,
  IncomeStatementResponse,
  JournalEntry,
  LedgerResponse,
  RecurringTransaction,
  RevenueByClientResponse,
  SafeUser,
  StudentRequirementsResponse,
  TrainingMaterial,
  TrialBalanceResponse,
  Vendor,
} from "../types";

const BASE = "/api";
const TOKEN_STORAGE_KEY = "wsa-token";

let authToken: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });
  if (res.status === 401) {
    onUnauthorized?.();
  }
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

async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  commodityTrades: {
    list: () => request<CommodityTrade[]>("/commodity-trades"),
    create: (data: Partial<CommodityTrade>) =>
      request<CommodityTrade>("/commodity-trades", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CommodityTrade>) =>
      request<CommodityTrade>(`/commodity-trades/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/commodity-trades/${id}`, { method: "DELETE" }),
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
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: SafeUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<SafeUser>("/auth/me"),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: true }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  users: {
    list: () => request<SafeUser[]>("/users"),
    create: (data: { name: string; email: string; password: string; role: string; clientId?: string | null }) =>
      request<SafeUser>("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{ name: string; email: string; password: string; role: string; clientId: string | null }>
    ) => request<SafeUser>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
  },
  instructors: {
    list: () => request<SafeUser[]>("/instructors"),
  },
  activity: {
    list: (clientId?: string) => request<ActivityEntry[]>(`/activity${clientId ? `?clientId=${clientId}` : ""}`),
  },
  trainingMaterials: {
    list: (category?: string) =>
      request<TrainingMaterial[]>(`/training-materials${category ? `?category=${category}` : ""}`),
    create: (
      data: { title: string; category: string; description?: string; url?: string },
      file?: File | null
    ) => {
      const form = new FormData();
      form.set("title", data.title);
      form.set("category", data.category);
      form.set("description", data.description ?? "");
      form.set("url", data.url ?? "");
      if (file) form.set("file", file);
      return request<TrainingMaterial>("/training-materials", { method: "POST", body: form });
    },
    update: (
      id: string,
      data: { title?: string; category?: string; description?: string; url?: string },
      file?: File | null,
      removeFile?: boolean
    ) => {
      const form = new FormData();
      if (data.title !== undefined) form.set("title", data.title);
      if (data.category !== undefined) form.set("category", data.category);
      if (data.description !== undefined) form.set("description", data.description);
      if (data.url !== undefined) form.set("url", data.url);
      if (file) form.set("file", file);
      if (removeFile) form.set("removeFile", "true");
      return request<TrainingMaterial>(`/training-materials/${id}`, { method: "PUT", body: form });
    },
    remove: (id: string) => request<void>(`/training-materials/${id}`, { method: "DELETE" }),
    download: (id: string, filename: string) => downloadFile(`/training-materials/${id}/file`, filename),
  },
  calendar: {
    list: (params?: { start?: string; end?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<CalendarEvent[]>(`/calendar${qs ? `?${qs}` : ""}`);
    },
    create: (data: Partial<CalendarEvent>) =>
      request<CalendarEvent>("/calendar", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CalendarEvent>) =>
      request<CalendarEvent>(`/calendar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/calendar/${id}`, { method: "DELETE" }),
  },
  aircraft: {
    list: () => request<Aircraft[]>("/aircraft"),
    create: (data: Partial<Aircraft>) => request<Aircraft>("/aircraft", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Aircraft>) =>
      request<Aircraft>(`/aircraft/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/aircraft/${id}`, { method: "DELETE" }),
  },
  classrooms: {
    list: () => request<Classroom[]>("/classrooms"),
    create: (name: string) => request<Classroom>("/classrooms", { method: "POST", body: JSON.stringify({ name }) }),
    remove: (id: string) => request<void>(`/classrooms/${id}`, { method: "DELETE" }),
  },
};
