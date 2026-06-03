// Domain types mirroring the Go backend JSON contract (see backend/finance).
// All monetary values are in millions of Rupiah (Rp juta).

/** Traffic-light health indicator. */
export type Status = "green" | "yellow" | "red";

/** Pill / chip colour tones supported by the stylesheet. */
export type Tone = "green" | "yellow" | "orange" | "red" | "neutral" | "crisis";

/** SLA / due state shared by receivables and payables. */
export type SLAState = "ok" | "due" | "overdue";

export interface Project {
  _id: string;
  id: string;
  name: string;
  units: number;
  budget: number;
  spent: number;
  revenue: number;
  collected: number;
  margin: number;
  status: Status;
  pic: string;
  cashNote: string;
  decision: string;
}

export interface Receivable {
  _id: string;
  id: string;
  project: string;
  customer: string;
  type: string;
  amount: number;
  aging: number;
  bucket: string;
  sla: SLAState;
  owner: string;
  next: string;
}

export interface Payable {
  _id: string;
  id: string;
  vendor: string;
  project: string;
  category: string;
  amount: number;
  dueDays: number;
  priority: string;
  status: SLAState;
  note: string;
}

export interface Facility {
  _id: string;
  name: string;
  type: string;
  plafond: number;
  used: number;
  rate: number;
  tenor: string;
  status: Status;
}

/** Ordered classification item (receivable type / aging bucket / priority). */
export interface MetaItem {
  key: string;
  label: string;
  tone: Tone;
  note?: string;
  sla?: string;
}

export interface CostCategory {
  name: string;
  budget: number;
  actual: number;
}

export interface Treasury {
  cashOnHand: number;
  restrictedCash: number;
  monthlyBurn: number;
}

export interface AIInsight {
  _id: string;
  type: string;
  tone: string;
  text: string;
  icon: string;
}

export interface Decision {
  _id: string;
  role: string;
  tone: string;
  text: string;
}

export interface CashflowPoint {
  period: string;
  inflow: number;
  outflow: number;
}

export interface KPI {
  _id: string;
  no: number;
  kpi: string;
  def: string;
  pic: string;
  upd: string;
  green: string;
  yellow: string;
  red: string;
  val: string;
  state: string;
}

export interface Trigger {
  _id: string;
  cond: string;
  thr: string;
  status: string;
  pic: string;
  act: string;
  esc: string;
}

export interface Summary {
  totalRevenue: number;
  cashPosition: number;
  collected: number;
  collectionRate: number;
  outstandingAR: number;
  outstandingAP: number;
  netMargin: number;
  budgetAbsorption: number;
  runway: number;
  overdueRisk: string;
  critical: number;
}

/** Full payload returned by GET /api/dashboard. */
export interface Dashboard {
  projects: Project[];
  receivables: Receivable[];
  receivableType: MetaItem[];
  agingMeta: MetaItem[];
  payables: Payable[];
  priorityMeta: MetaItem[];
  facilities: Facility[];
  costStructure: CostCategory[];
  treasury: Treasury;
  aiInsights: AIInsight[];
  decisions: Decision[];
  cashflowTrend: CashflowPoint[];
  kpiTable: KPI[];
  triggers: Trigger[];
  summary: Summary;
}

/** Dashboard enriched on the client with key->item lookup maps for the meta arrays. */
export interface DashboardData extends Dashboard {
  receivableTypeMap: Record<string, MetaItem>;
  agingMap: Record<string, MetaItem>;
  priorityMap: Record<string, MetaItem>;
}

/** Authenticated account (mirrors backend domain.User, no password material). */
export interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "viewer";
}

/** Response of POST /api/auth/login. */
export interface LoginResponse {
  token: string;
  user: User;
}
