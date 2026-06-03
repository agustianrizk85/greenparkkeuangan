import type { ReactNode } from "react";
import type { DashboardData, Project, Status, Tone } from "../types";
import { rp, STATUS_LABEL, toneClass } from "../lib/status";
import { Bar, Pill, Stat, StatusPill } from "./ui";
import { Icon } from "./Icon";

/* ---- Single project deep-dive ----------------------------------------- */
export function ProjectDetail({ p }: { p: Project }) {
  const grossProfit = p.revenue * (p.margin / 100);
  const absorb = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
  const collPct = p.revenue > 0 ? Math.round((p.collected / p.revenue) * 100) : 0;
  const fields: [string, ReactNode][] = [
    ["Total Unit", p.units],
    ["Nilai Penjualan", rp(p.revenue)],
    ["RAB / Budget", rp(p.budget)],
    ["Realisasi Biaya", rp(p.spent) + " (" + absorb + "%)"],
    ["Kas Tertagih", rp(p.collected) + " (" + collPct + "%)"],
    ["Proyeksi Laba Kotor", rp(grossProfit)],
    ["Gross Margin", p.margin + "%"],
    ["PIC Finance", p.pic],
    ["Catatan Kas", p.cashNote],
    ["Keputusan", p.decision],
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <StatusPill status={p.status} />
        <span className="note">Kesehatan finansial proyek: margin, serapan biaya & koleksi kas.</span>
      </div>
      <div className="cards-row">
        {fields.map(([k, v]) => (
          <Stat key={k} label={k} value={v} valueStyle={{ fontSize: 18 }} />
        ))}
      </div>
      <div>
        <div className="section-title">Koleksi Kas vs Nilai Penjualan</div>
        <Bar value={collPct} tone={p.status} />
        <div className="note" style={{ marginTop: 6 }}>
          {rp(p.collected)} dari {rp(p.revenue)} tertagih ({collPct}%).{" "}
          {collPct < 60 ? "Percepat penagihan termin & DP." : "Arus kas masuk dalam jalur."}
        </div>
      </div>
    </>
  );
}

/* ---- Projects focus --------------------------------------------------- */
function ProjectsFocus({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="section-title">Project P&L Control — seluruh proyek aktif</div>
      <table className="big">
        <thead>
          <tr>
            <th>Proyek</th>
            <th>Unit</th>
            <th>Penjualan</th>
            <th>Budget</th>
            <th>Realisasi</th>
            <th>Tertagih</th>
            <th>Margin</th>
            <th>Status</th>
            <th>PIC</th>
            <th>Catatan Kas</th>
          </tr>
        </thead>
        <tbody>
          {d.projects.map((p) => (
            <tr key={p.id}>
              <td className="name">{p.name}</td>
              <td className="num">{p.units}</td>
              <td className="num">{rp(p.revenue)}</td>
              <td className="num">{rp(p.budget)}</td>
              <td className="num">{rp(p.spent)}</td>
              <td className="num">{rp(p.collected)}</td>
              <td className="num" style={{ color: p.margin >= 25 ? "var(--green-700)" : p.margin >= 20 ? "var(--warn)" : "var(--bad)" }}>
                {p.margin}%
              </td>
              <td>
                <StatusPill status={p.status} />
              </td>
              <td>{p.pic}</td>
              <td style={{ fontSize: 12 }}>{p.cashNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---- Receivables focus ------------------------------------------------ */
function ReceivableFocus({ d }: { d: DashboardData }) {
  const slaTone: Record<string, Tone> = { ok: "green", due: "yellow", overdue: "red" };
  const slaLabel: Record<string, string> = { ok: "On-time", due: "Due", overdue: "Overdue" };
  return (
    <>
      <div className="section-title">Receivables (AR) — penagihan & aging</div>
      <table className="big">
        <thead>
          <tr>
            <th>ID</th>
            <th>Proyek</th>
            <th>Konsumen</th>
            <th>Tipe</th>
            <th>Nilai</th>
            <th>Aging</th>
            <th>Bucket</th>
            <th>SLA</th>
            <th>Owner</th>
            <th>Tindak Lanjut</th>
          </tr>
        </thead>
        <tbody>
          {d.receivables.map((r) => (
            <tr key={r.id}>
              <td className="num">{r.id}</td>
              <td>{r.project}</td>
              <td className="name">{r.customer}</td>
              <td>
                <Pill tone={d.receivableTypeMap[r.type].tone} dot={false}>
                  {d.receivableTypeMap[r.type].label}
                </Pill>
              </td>
              <td className="num">{rp(r.amount)}</td>
              <td className="num" style={{ color: r.aging > 90 ? "var(--bad)" : r.aging > 30 ? "var(--warn)" : "var(--ink-2)" }}>
                {r.aging > 0 ? r.aging + "h" : "—"}
              </td>
              <td>
                <Pill tone={d.agingMap[r.bucket].tone} dot={false}>
                  {d.agingMap[r.bucket].label}
                </Pill>
              </td>
              <td>
                <Pill tone={slaTone[r.sla]} dot={false}>
                  {slaLabel[r.sla]}
                </Pill>
              </td>
              <td>{r.owner}</td>
              <td style={{ fontSize: 12 }}>{r.next}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <div className="section-title">Klasifikasi Aging & SLA</div>
        <div className="cards-row">
          {d.agingMeta.map((m) => (
            <div
              className="stat"
              key={m.key}
              style={{ borderLeft: `3px solid var(--${m.tone === "red" ? "bad" : m.tone === "orange" ? "orange" : m.tone === "yellow" ? "warn" : "ok"})` }}
            >
              <Pill tone={m.tone}>{m.label}</Pill>
              <span className="note" style={{ marginTop: 5 }}>
                {m.sla}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---- Payables focus --------------------------------------------------- */
function PayableFocus({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="section-title">Payables (AP) — kewajiban & prioritas bayar</div>
      <table className="big">
        <thead>
          <tr>
            <th>ID</th>
            <th>Vendor</th>
            <th>Proyek</th>
            <th>Kategori</th>
            <th>Nilai</th>
            <th>Jatuh Tempo</th>
            <th>Prioritas</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {d.payables.map((p) => (
            <tr key={p.id}>
              <td className="num">{p.id}</td>
              <td className="name">{p.vendor}</td>
              <td>{p.project}</td>
              <td>{p.category}</td>
              <td className="num">{rp(p.amount)}</td>
              <td className="num" style={{ color: p.dueDays < 0 ? "var(--bad)" : p.dueDays <= 3 ? "var(--warn)" : "var(--ink-2)" }}>
                {p.dueDays < 0 ? Math.abs(p.dueDays) + "h lewat" : "H-" + p.dueDays}
              </td>
              <td>
                <Pill tone={d.priorityMap[p.priority].tone} dot={false}>
                  {d.priorityMap[p.priority].label}
                </Pill>
              </td>
              <td style={{ fontSize: 12 }}>{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <div className="section-title">Prioritas Pembayaran</div>
        <div className="cards-row">
          {d.priorityMeta.map((m) => (
            <div
              className="stat"
              key={m.key}
              style={{ borderLeft: `3px solid var(--${m.tone === "red" ? "bad" : m.tone === "orange" ? "orange" : "ink-3"})` }}
            >
              <Pill tone={m.tone}>{m.label}</Pill>
              <span className="note" style={{ marginTop: 5 }}>
                {m.note}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---- Cost structure focus --------------------------------------------- */
function CostFocus({ d }: { d: DashboardData }) {
  const totalBudget = d.costStructure.reduce((s, c) => s + c.budget, 0);
  const totalActual = d.costStructure.reduce((s, c) => s + c.actual, 0);
  const maxBudget = Math.max(...d.costStructure.map((c) => c.budget));
  return (
    <>
      <div className="section-title">Struktur Biaya — Budget vs Realisasi</div>
      <div className="cards-row">
        <Stat label="Total Budget" value={rp(totalBudget)} />
        <Stat label="Total Realisasi" value={rp(totalActual)} tone="warn" />
        <Stat label="Serapan" value={Math.round((totalActual / totalBudget) * 100) + "%"} tone="warn" />
        <Stat label="Sisa Budget" value={rp(totalBudget - totalActual)} tone="ok" />
      </div>
      <div>
        <div className="section-title">Rincian per Kategori</div>
        {d.costStructure.map((c) => {
          const pct = c.budget > 0 ? Math.round((c.actual / c.budget) * 100) : 0;
          const tone: Status = pct > 100 ? "red" : pct > 90 ? "yellow" : "green";
          return (
            <div key={c.name} style={{ display: "grid", gridTemplateColumns: "120px 1fr 150px", alignItems: "center", gap: 12, marginBottom: 9 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
              <div>
                <Bar value={c.actual} max={maxBudget} tone={tone} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "right", color: "var(--ink-2)" }}>
                {rp(c.actual)} / {rp(c.budget)} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
      <div className="note">
        Prinsip: biaya dianggap terkendali bukan saat dana cair, tetapi saat realisasi sesuai RAB dan progres fisik proyek.
      </div>
    </>
  );
}

/* ---- Funding focus ---------------------------------------------------- */
function FundingFocus({ d }: { d: DashboardData }) {
  const t = d.treasury;
  const totalPlafond = d.facilities.reduce((s, f) => s + f.plafond, 0);
  const totalUsed = d.facilities.reduce((s, f) => s + f.used, 0);
  return (
    <>
      <div className="section-title">Treasury & Likuiditas</div>
      <div className="cards-row">
        <Stat label="Kas Tersedia" value={rp(t.cashOnHand)} tone="ok" />
        <Stat label="Kas Terbatas (escrow)" value={rp(t.restrictedCash)} />
        <Stat label="Burn / Bulan" value={rp(t.monthlyBurn)} tone="warn" />
        <Stat label="Cash Runway" value={(t.cashOnHand / t.monthlyBurn).toFixed(1) + " bln"} tone="warn" />
      </div>
      <div className="section-title">Fasilitas Pendanaan</div>
      <table className="big">
        <thead>
          <tr>
            <th>Fasilitas</th>
            <th>Jenis</th>
            <th>Plafond</th>
            <th>Terpakai</th>
            <th>Utilisasi</th>
            <th>Bunga</th>
            <th>Tenor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {d.facilities.map((f) => {
            const pct = f.plafond > 0 ? Math.round((f.used / f.plafond) * 100) : 0;
            return (
              <tr key={f.name}>
                <td className="name">{f.name}</td>
                <td>{f.type}</td>
                <td className="num">{rp(f.plafond)}</td>
                <td className="num">{rp(f.used)}</td>
                <td className="num" style={{ color: pct > 90 ? "var(--bad)" : pct > 75 ? "var(--warn)" : "var(--green-700)" }}>
                  {pct}%
                </td>
                <td className="num">{f.rate ? f.rate + "%" : "—"}</td>
                <td className="num">{f.tenor}</td>
                <td>
                  <StatusPill status={f.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="note">
        Total fasilitas {rp(totalPlafond)} · terpakai {rp(totalUsed)} ({Math.round((totalUsed / totalPlafond) * 100)}%).
        Jaga ruang tarik untuk menutup gap arus kas proyek.
      </div>
    </>
  );
}

/* ---- AI + Decisions focus --------------------------------------------- */
function AiFocus({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="section-title">AI Insights & Recommendation</div>
      <div className="cards-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {d.aiInsights.map((a, i) => (
          <div className={`ai-card ${a.tone}`} key={i}>
            <span className="ai-ico">
              <Icon name={a.icon} size={16} />
            </span>
            <div className="ai-tx">
              <div className="ai-ty">{a.type}</div>
              <div className="ai-ms" style={{ fontSize: 13 }}>
                {a.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="section-title">Critical Decision Box</div>
      <div className="cards-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {d.decisions.map((dc, i) => (
          <div className={`dec ${dc.tone}`} key={i}>
            <span className="drole">{dc.role}</span>
            <span className="dtx" style={{ fontSize: 13 }}>
              {dc.text}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---- KPI reference table ---------------------------------------------- */
function KpiFocus({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="section-title">Tabel KPI Dashboard Finance — 15 indikator</div>
      <table className="big">
        <thead>
          <tr>
            <th>No</th>
            <th>KPI</th>
            <th>Definisi</th>
            <th>PIC</th>
            <th>Update</th>
            <th>Hijau</th>
            <th>Kuning</th>
            <th>Merah</th>
            <th>Nilai Kini</th>
          </tr>
        </thead>
        <tbody>
          {d.kpiTable.map((k) => (
            <tr key={k.no}>
              <td className="num">{k.no}</td>
              <td className="name">{k.kpi}</td>
              <td style={{ fontSize: 12 }}>{k.def}</td>
              <td>{k.pic}</td>
              <td>{k.upd}</td>
              <td className="num" style={{ color: "var(--green-700)" }}>
                {k.green}
              </td>
              <td className="num" style={{ color: "var(--warn)" }}>
                {k.yellow}
              </td>
              <td className="num" style={{ color: "var(--bad)" }}>
                {k.red}
              </td>
              <td>
                <Pill tone={toneClass(k.state)} dot={false}>
                  {k.val}
                </Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---- Early warning triggers ------------------------------------------- */
function TriggerFocus({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="section-title">Early Warning Trigger</div>
      <table className="big">
        <thead>
          <tr>
            <th>Kondisi</th>
            <th>Ambang Batas</th>
            <th>Status</th>
            <th>PIC</th>
            <th>Tindakan Wajib</th>
            <th>Eskalasi</th>
          </tr>
        </thead>
        <tbody>
          {d.triggers.map((t, i) => (
            <tr key={i}>
              <td className="name">{t.cond}</td>
              <td className="num">{t.thr}</td>
              <td>
                <Pill tone={toneClass(t.status)} dot={false}>
                  {t.status === "crisis" ? "Crisis" : STATUS_LABEL[t.status as Status]}
                </Pill>
              </td>
              <td>{t.pic}</td>
              <td style={{ fontSize: 12 }}>{t.act}</td>
              <td>{t.esc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export interface FocusEntry {
  tag: string;
  title: string;
  sub: string;
  render: (d: DashboardData) => ReactNode;
}

export const FOCUS_META: Record<string, FocusEntry> = {
  project: { tag: "PANEL B", title: "Project P&L Control", sub: "kendali laba proyek", render: (d) => <ProjectsFocus d={d} /> },
  receivable: { tag: "PANEL C", title: "Receivables (AR) Aging", sub: "koleksi konsumen", render: (d) => <ReceivableFocus d={d} /> },
  payable: { tag: "PANEL D", title: "Payables (AP) Control", sub: "kewajiban vendor", render: (d) => <PayableFocus d={d} /> },
  cost: { tag: "PANEL E", title: "Struktur Biaya", sub: "budget vs realisasi", render: (d) => <CostFocus d={d} /> },
  funding: { tag: "PANEL F", title: "Funding & Treasury", sub: "likuiditas & fasilitas", render: (d) => <FundingFocus d={d} /> },
  ai: { tag: "PANEL G+H", title: "AI Insights & Critical Decision", sub: "intelligence & decision", render: (d) => <AiFocus d={d} /> },
  kpi: { tag: "SECTION 6", title: "KPI Dashboard Finance", sub: "definisi & ambang batas", render: (d) => <KpiFocus d={d} /> },
  triggers: { tag: "SECTION 7", title: "Early Warning Trigger", sub: "alarm otomatis", render: (d) => <TriggerFocus d={d} /> },
  cashflow: { tag: "PANEL A", title: "Cash Flow Control", sub: "kas masuk vs keluar", render: (d) => <FundingFocus d={d} /> },
};
