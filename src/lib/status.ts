import type { MetaItem, Status, Tone } from "../types";

/** Human label for each traffic-light status. */
export const STATUS_LABEL: Record<Status, string> = {
  green: "Sehat",
  yellow: "Waspada",
  red: "Kritis",
};

/** Pill tone for each traffic-light status. */
export const STATUS_TONE: Record<Status, Tone> = {
  green: "green",
  yellow: "yellow",
  red: "red",
};

/** CSS colour-variable suffix for a status (var(--ok|warn|bad)). */
export function statusVar(st: Status): "ok" | "warn" | "bad" {
  return st === "green" ? "ok" : st === "yellow" ? "warn" : "bad";
}

/** Build a key->item lookup from an ordered MetaItem array. */
export function toMap(arr: MetaItem[]): Record<string, MetaItem> {
  return arr.reduce<Record<string, MetaItem>>((m, it) => {
    m[it.key] = it;
    return m;
  }, {});
}

/** Map a free-form state string (status / kpi state / trigger status) to a pill tone. */
export function toneClass(st: string): Tone {
  switch (st) {
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "crisis":
      return "crisis";
    case "red":
      return "red";
    default:
      return "neutral";
  }
}

/**
 * Format a Rupiah amount given in millions (Rp juta) into a compact label.
 * Values ≥ 1.000 juta are shown in billions (miliar) to keep the war-room view tidy.
 */
export function rp(juta: number): string {
  if (Math.abs(juta) >= 1000) {
    const miliar = juta / 1000;
    return "Rp " + miliar.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " M";
  }
  return "Rp " + juta.toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " jt";
}
