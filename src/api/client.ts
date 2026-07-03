import type {
  AutoSyncStatus,
  Dashboard,
  ImportRecord,
  ImportResult,
  LoginResponse,
  PRResult,
  PRSheetConfig,
  Purchasing,
  User,
} from "../types";

/** Backend base URL — override with VITE_API_BASE at build/dev time. */
const ORIGIN = import.meta.env.VITE_API_BASE ?? "http://localhost:8084";
const BASE = ORIGIN + "/api";
const TOKEN_KEY = "gp_fin_token";

let token: string | null = localStorage.getItem(TOKEN_KEY);

/** Thrown when the backend rejects the session (401) — App falls back to login. */
export class AuthError extends Error {}

function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

/** multipart upload helper for the XLSX import endpoints. */
async function upload<T>(path: string, file: File): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = "Bearer " + token;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(BASE + path, { method: "POST", headers, body: fd });
  return handle<T>(res);
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    setToken(null);
    throw new AuthError("Sesi berakhir, silakan login kembali.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      /* no JSON body */
    }
    throw new Error(`HTTP ${res.status} ${detail}`.trim());
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  base: BASE,
  hasToken: () => !!token,

  /** WebSocket URL for realtime revision push (null when logged out). */
  realtimeURL(): string | null {
    if (!token) return null;
    const ws = ORIGIN.replace(/^http/, "ws");
    return `${ws}/api/ws?token=${encodeURIComponent(token)}`;
  },

  // ---- auth ----
  async login(username: string, password: string): Promise<User> {
    const res = await req<LoginResponse>("POST", "/auth/login", { username, password });
    setToken(res.token);
    return res.user;
  },
  async logout(): Promise<void> {
    try {
      await req("POST", "/auth/logout");
    } finally {
      setToken(null);
    }
  },
  me: () => req<User>("GET", "/auth/me"),

  // ---- reads ----
  dashboard: () => req<Dashboard>("GET", "/dashboard"),
  version: () => req<{ rev: number }>("GET", "/version"),

  // ---- ingest: upload XLSX ----
  importPreview: (file: File) => upload<ImportResult>("/import/preview", file),
  importApprove: (file: File) => upload<ImportRecord>("/import/approve", file),

  // ---- ingest: Google Sheets sync ----
  syncPreview: () => req<ImportResult>("POST", "/import/sync-preview"),
  syncApprove: () => req<ImportRecord>("POST", "/import/sync-approve"),

  // ---- procurement (PR / pembelian) — independent async sync ----
  purchasing: () => req<Purchasing>("GET", "/purchasing"),
  prSheetGet: () => req<PRSheetConfig>("GET", "/purchasing/sheet"),
  prSheetSet: (url: string) => req<PRSheetConfig>("PUT", "/purchasing/sheet", { url }),
  purchasingSyncPreview: () => req<PRResult>("POST", "/purchasing/sync-preview"),
  purchasingSyncApprove: () => req<Purchasing>("POST", "/purchasing/sync-approve"),

  // ---- auto-sync ----
  autoStatus: () => req<AutoSyncStatus>("GET", "/import/auto"),
  autoSet: (enabled: boolean, intervalSec: number) =>
    req<AutoSyncStatus>("PUT", "/import/auto", { enabled, intervalSec }),

  // ---- history / lifecycle ----
  importHistory: () => req<ImportRecord[]>("GET", "/import/history"),
  importReset: () => req<ImportRecord>("POST", "/import/reset"),
  importRollback: (id: string) => req<ImportRecord>("POST", `/import/rollback/${encodeURIComponent(id)}`),
};
