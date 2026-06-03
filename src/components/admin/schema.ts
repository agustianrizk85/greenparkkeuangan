import type { Dashboard } from "../../types";

export type FieldType = "text" | "number" | "select" | "checkbox";

export interface Field {
  key: string; // supports dotted paths e.g. "attributed.name"
  label: string;
  type: FieldType;
  options?: string[]; // for select
  step?: number; // for number
  full?: boolean; // span full width in the form grid
}

export type Section =
  | { kind: "crud"; id: string; label: string; collection: string; fields: Field[]; columns: string[]; pick: (d: Dashboard) => Record<string, unknown>[] }
  | { kind: "single"; id: string; label: string; path: string; fields: Field[]; pick: (d: Dashboard) => Record<string, unknown> }
  | { kind: "array"; id: string; label: string; path: string; fields: Field[]; pick: (d: Dashboard) => Record<string, unknown>[]; addable: boolean; nullableKeys?: string[] };

const num = (key: string, label: string, step = 1): Field => ({ key, label, type: "number", step });
const txt = (key: string, label: string, full = false): Field => ({ key, label, type: "text", full });
const STATUS = ["green", "yellow", "red"];
const TONES = ["green", "yellow", "orange", "red", "neutral", "crisis"];

/* ---- collections (CRUD) ---- */

const projectFields: Field[] = [
  txt("id", "Kode (unik)"),
  txt("name", "Nama Proyek", true),
  num("units", "Jumlah Unit"),
  num("budget", "Budget / RAB (Jt)"),
  num("spent", "Realisasi Biaya (Jt)"),
  num("revenue", "Nilai Penjualan (Jt)"),
  num("collected", "Kas Tertagih (Jt)"),
  num("margin", "Gross Margin (%)", 0.1),
  { key: "status", label: "Status", type: "select", options: STATUS },
  txt("pic", "PIC Finance"),
  txt("cashNote", "Catatan Kas", true),
  txt("decision", "Keputusan", true),
];

const receivableFields: Field[] = [
  txt("id", "ID (mis. AR-241)"),
  txt("project", "Proyek", true),
  txt("customer", "Konsumen", true),
  { key: "type", label: "Tipe", type: "select", options: ["kpr", "cash", "dp"] },
  num("amount", "Nilai (Jt)"),
  num("aging", "Aging (hari)"),
  { key: "bucket", label: "Bucket Aging", type: "select", options: ["current", "d30", "d60", "d90"] },
  { key: "sla", label: "SLA", type: "select", options: ["ok", "due", "overdue"] },
  txt("owner", "Owner"),
  txt("next", "Tindak Lanjut", true),
];

const payableFields: Field[] = [
  txt("id", "ID (mis. AP-512)"),
  txt("vendor", "Vendor", true),
  txt("project", "Proyek", true),
  { key: "category", label: "Kategori", type: "select", options: ["termin", "material", "upah", "overhead"] },
  num("amount", "Nilai (Jt)"),
  num("dueDays", "Jatuh Tempo (hari, − = lewat)"),
  { key: "priority", label: "Prioritas", type: "select", options: ["high", "med", "low"] },
  { key: "status", label: "Status", type: "select", options: ["ok", "due", "overdue"] },
  txt("note", "Catatan", true),
];

const facilityFields: Field[] = [
  txt("name", "Nama Fasilitas", true),
  { key: "type", label: "Jenis", type: "select", options: ["KI", "KMK", "KPR", "Equity"] },
  num("plafond", "Plafond (Jt)"),
  num("used", "Terpakai (Jt)"),
  num("rate", "Bunga (%)", 0.01),
  txt("tenor", "Tenor"),
  { key: "status", label: "Status", type: "select", options: STATUS },
];

const aiFields: Field[] = [
  txt("type", "Jenis Insight", true),
  { key: "tone", label: "Tone", type: "select", options: ["red", "orange", "yellow", "green"] },
  txt("text", "Teks Insight", true),
  { key: "icon", label: "Ikon", type: "select", options: ["cash", "trend", "receipt", "bank", "alert", "rec", "wallet", "coins", "scale", "pie"] },
];

const decisionFields: Field[] = [
  txt("role", "Peran (Role)"),
  { key: "tone", label: "Tone", type: "select", options: ["red", "orange", "navy", "green"] },
  txt("text", "Keputusan", true),
];

const kpiFields: Field[] = [
  num("no", "No"),
  txt("kpi", "Nama KPI", true),
  txt("def", "Definisi", true),
  txt("pic", "PIC"),
  txt("upd", "Frekuensi Update"),
  txt("green", "Ambang Hijau"),
  txt("yellow", "Ambang Kuning"),
  txt("red", "Ambang Merah"),
  txt("val", "Nilai Kini"),
  { key: "state", label: "Status", type: "select", options: STATUS },
];

const triggerFields: Field[] = [
  txt("cond", "Kondisi", true),
  txt("thr", "Ambang Batas"),
  { key: "status", label: "Status", type: "select", options: ["green", "yellow", "red", "crisis"] },
  txt("pic", "PIC"),
  txt("act", "Tindakan Wajib", true),
  txt("esc", "Eskalasi"),
];

/* ---- singletons / arrays ---- */

const treasuryFields: Field[] = [
  num("cashOnHand", "Kas Tersedia (Jt)"),
  num("restrictedCash", "Kas Terbatas / Escrow (Jt)"),
  num("monthlyBurn", "Burn Operasional / Bulan (Jt)"),
];

const cashflowFields: Field[] = [txt("period", "Periode"), num("inflow", "Kas Masuk (Jt)"), num("outflow", "Kas Keluar (Jt)")];

const costFields: Field[] = [txt("name", "Kategori Biaya"), num("budget", "Budget (Jt)"), num("actual", "Realisasi (Jt)")];

const metaFields = (noteLabel: string): Field[] => [
  txt("key", "Key (unik)"),
  txt("label", "Label"),
  { key: "tone", label: "Tone", type: "select", options: TONES },
  txt(noteLabel === "sla" ? "sla" : "note", noteLabel === "sla" ? "SLA / Catatan" : "Catatan", true),
];

/** All master-data sections, grouped for the admin sidebar. */
export const SECTIONS: Section[] = [
  { kind: "crud", id: "projects", label: "Proyek (P&L)", collection: "projects", fields: projectFields, columns: ["id", "name", "revenue", "spent", "margin", "status", "pic"], pick: (d) => d.projects as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "receivables", label: "Piutang (AR)", collection: "receivables", fields: receivableFields, columns: ["id", "customer", "type", "amount", "aging", "bucket"], pick: (d) => d.receivables as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "payables", label: "Hutang (AP)", collection: "payables", fields: payableFields, columns: ["id", "vendor", "category", "amount", "dueDays", "priority"], pick: (d) => d.payables as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "facilities", label: "Pendanaan / Fasilitas", collection: "facilities", fields: facilityFields, columns: ["name", "type", "plafond", "used", "status"], pick: (d) => d.facilities as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "kpis", label: "KPI Scorecard", collection: "kpis", fields: kpiFields, columns: ["no", "kpi", "val", "state", "pic"], pick: (d) => d.kpiTable as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "triggers", label: "Early Warning", collection: "triggers", fields: triggerFields, columns: ["cond", "thr", "status", "pic"], pick: (d) => d.triggers as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "ai-insights", label: "AI Insights", collection: "ai-insights", fields: aiFields, columns: ["type", "tone", "text"], pick: (d) => d.aiInsights as unknown as Record<string, unknown>[] },
  { kind: "crud", id: "decisions", label: "Critical Decision", collection: "decisions", fields: decisionFields, columns: ["role", "tone", "text"], pick: (d) => d.decisions as unknown as Record<string, unknown>[] },
  { kind: "single", id: "treasury", label: "Treasury / Kas", path: "treasury", fields: treasuryFields, pick: (d) => ({ ...d.treasury }) },
  { kind: "array", id: "cashflow", label: "Tren Arus Kas", path: "cashflow", fields: cashflowFields, addable: true, pick: (d) => d.cashflowTrend as unknown as Record<string, unknown>[] },
  { kind: "array", id: "cost-structure", label: "Struktur Biaya", path: "cost-structure", fields: costFields, addable: true, pick: (d) => d.costStructure as unknown as Record<string, unknown>[] },
  { kind: "array", id: "receivable-type", label: "Meta · Tipe Piutang", path: "receivable-type", fields: metaFields("note"), addable: true, pick: (d) => d.receivableType as unknown as Record<string, unknown>[] },
  { kind: "array", id: "aging-meta", label: "Meta · Aging Piutang", path: "aging-meta", fields: metaFields("sla"), addable: true, pick: (d) => d.agingMeta as unknown as Record<string, unknown>[] },
  { kind: "array", id: "priority-meta", label: "Meta · Prioritas Hutang", path: "priority-meta", fields: metaFields("note"), addable: true, pick: (d) => d.priorityMeta as unknown as Record<string, unknown>[] },
];
