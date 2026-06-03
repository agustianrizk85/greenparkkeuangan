import type {
  AIInsight,
  CashflowPoint,
  Decision,
  Facility,
  MetaItem,
  Payable,
  Project,
  Receivable,
  Summary,
} from "../types";
import { rp, statusVar } from "../lib/status";
import { Bar, Kpi, Panel, Pill, Stat, StatusPill } from "./ui";
import { Icon } from "./Icon";
import { CashflowChart } from "./CashflowChart";

/* A. Executive KPI row -------------------------------------------------- */
export function KpiRow({ s }: { s: Summary }) {
  const runwayTone = s.runway >= 6 ? "ok" : s.runway >= 3 ? "warn" : "bad";
  const collTone = s.collectionRate >= 90 ? "ok" : s.collectionRate >= 75 ? "warn" : "bad";
  return (
    <div className="kpi-row">
      <Kpi label="Total Penjualan" value={rp(s.totalRevenue)} delta="nilai kontrak" />
      <Kpi label="Posisi Kas" value={rp(s.cashPosition)} tone="ok" delta="cash on hand" />
      <Kpi label="Collection Rate" value={s.collectionRate + "%"} tone={collTone} delta={rp(s.collected) + " tertagih"} deltaDir={collTone === "bad" ? "down" : "up"} />
      <Kpi label="Piutang (AR)" value={rp(s.outstandingAR)} tone="warn" delta={s.critical + " macet >90h"} deltaDir="down" />
      <Kpi label="Hutang (AP)" value={rp(s.outstandingAP)} tone="warn" delta="jatuh tempo" />
      <Kpi label="Net Margin" value={s.netMargin + "%"} tone={s.netMargin >= 25 ? "ok" : "warn"} delta="gross tertimbang" />
      <Kpi label="Cash Runway" value={s.runway} unit="bln" tone={runwayTone} delta="terhadap burn" />
      <Kpi label="Risiko Koleksi" value={s.overdueRisk} tone="bad" delta={s.budgetAbsorption + "% serapan budget"} />
    </div>
  );
}

/* Cashflow chart panel -------------------------------------------------- */
export function CashflowPanel({ trend, onExpand }: { trend: CashflowPoint[]; onExpand: () => void }) {
  return (
    <Panel tag="ARUS KAS" title="Cash Flow Control" sub="Kas Masuk vs Kas Keluar" onExpand={onExpand}>
      <div className="chart-wrap">
        <div className="chart-legend">
          <span className="l-act">
            <i />
            Kas Masuk (inflow)
          </span>
          <span className="l-plan">
            <i />
            Kas Keluar (outflow)
          </span>
          <span style={{ marginLeft: "auto", color: "var(--ink-3)", fontWeight: 500 }}>skala: Rp miliar</span>
        </div>
        <CashflowChart trend={trend} />
      </div>
    </Panel>
  );
}

/* B. Project P&L Table -------------------------------------------------- */
export function ProjectPanel({
  projects,
  onExpand,
  onRow,
}: {
  projects: Project[];
  onExpand: () => void;
  onRow: (p: Project) => void;
}) {
  return (
    <Panel tag="PROYEK" title="Project P&L Control" sub={`${projects.length} proyek`} onExpand={onExpand}>
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Proyek</th>
              <th style={{ textAlign: "right" }}>Penjualan</th>
              <th style={{ textAlign: "right" }}>Serapan</th>
              <th style={{ width: 90 }}>Tertagih</th>
              <th style={{ textAlign: "right" }}>Margin</th>
              <th>Status</th>
              <th>Catatan Kas</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const collPct = p.revenue > 0 ? Math.round((p.collected / p.revenue) * 100) : 0;
              const absorb = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
              return (
                <tr key={p.id} className="clickable" onClick={() => onRow(p)}>
                  <td className="row-accent" style={{ background: `var(--${statusVar(p.status)})` }}></td>
                  <td className="name">
                    {p.name}
                    <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>{p.pic}</div>
                  </td>
                  <td className="num">{rp(p.revenue)}</td>
                  <td className="num" style={{ color: absorb > 90 ? "var(--bad)" : "var(--ink-2)" }}>{absorb}%</td>
                  <td>
                    <Bar value={collPct} tone={p.status} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)" }}>{collPct}%</span>
                  </td>
                  <td
                    className="num"
                    style={{ color: p.margin >= 25 ? "var(--green-700)" : p.margin >= 20 ? "var(--warn)" : "var(--bad)", fontWeight: 600 }}
                  >
                    {p.margin}%
                  </td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ink-2)" }}>{p.cashNote}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* C. Receivables (AR) aging --------------------------------------------- */
export function ReceivablePanel({
  receivables,
  agingMap,
  typeMap,
  onExpand,
}: {
  receivables: Receivable[];
  agingMap: Record<string, MetaItem>;
  typeMap: Record<string, MetaItem>;
  onExpand: () => void;
}) {
  const cnt = { current: 0, d30: 0, d60: 0, d90: 0 } as Record<string, number>;
  const sum = { current: 0, d30: 0, d60: 0, d90: 0 } as Record<string, number>;
  receivables.forEach((r) => {
    cnt[r.bucket] = (cnt[r.bucket] ?? 0) + 1;
    sum[r.bucket] = (sum[r.bucket] ?? 0) + r.amount;
  });
  return (
    <Panel tag="PIUTANG" title="Receivables (AR) Aging" sub="koleksi konsumen" accent="var(--warn)" onExpand={onExpand}>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 10 }}>
        <Stat label="Lancar" value={rp(sum.current)} tone="ok" />
        <Stat label="1–30h" value={rp(sum.d30)} tone="warn" />
        <Stat label="31–60h" value={rp(sum.d60)} />
        <Stat label=">90h" value={rp(sum.d90)} tone="bad" />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Konsumen</th>
              <th>Tipe</th>
              <th style={{ textAlign: "right" }}>Nilai</th>
              <th style={{ textAlign: "right" }}>Aging</th>
              <th>Bucket</th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.id}</td>
                <td className="name" style={{ whiteSpace: "nowrap" }}>
                  {r.customer}
                  <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>{r.project}</div>
                </td>
                <td>
                  <Pill tone={typeMap[r.type].tone} dot={false}>
                    {typeMap[r.type].label}
                  </Pill>
                </td>
                <td className="num">{rp(r.amount)}</td>
                <td
                  className="num"
                  style={{ color: r.aging > 90 ? "var(--bad)" : r.aging > 30 ? "var(--warn)" : "var(--ink-2)", fontWeight: 600 }}
                >
                  {r.aging > 0 ? r.aging + "h" : "—"}
                </td>
                <td>
                  <Pill tone={agingMap[r.bucket].tone} dot={false}>
                    {agingMap[r.bucket].label}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* D. Payables (AP) ------------------------------------------------------ */
export function PayablePanel({
  payables,
  priorityMap,
  onExpand,
}: {
  payables: Payable[];
  priorityMap: Record<string, MetaItem>;
  onExpand: () => void;
}) {
  const total = payables.reduce((s, p) => s + p.amount, 0);
  const overdue = payables.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
  const high = payables.filter((p) => p.priority === "high").reduce((s, p) => s + p.amount, 0);
  return (
    <Panel tag="HUTANG" title="Payables (AP) Control" sub="kewajiban vendor" accent="var(--orange)" onExpand={onExpand}>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 10 }}>
        <Stat label="Total Hutang" value={rp(total)} />
        <Stat label="Jatuh Tempo" value={rp(overdue)} tone="bad" />
        <Stat label="Prioritas Tinggi" value={rp(high)} tone="warn" />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Kategori</th>
              <th style={{ textAlign: "right" }}>Nilai</th>
              <th style={{ textAlign: "right" }}>Tempo</th>
              <th>Prioritas</th>
            </tr>
          </thead>
          <tbody>
            {payables.map((p) => (
              <tr key={p.id}>
                <td className="name" style={{ whiteSpace: "nowrap" }}>
                  {p.vendor}
                  <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>{p.project}</div>
                </td>
                <td style={{ fontSize: 11 }}>{p.category}</td>
                <td className="num">{rp(p.amount)}</td>
                <td
                  className="num"
                  style={{ color: p.dueDays < 0 ? "var(--bad)" : p.dueDays <= 3 ? "var(--warn)" : "var(--ink-2)", fontWeight: 600 }}
                >
                  {p.dueDays < 0 ? Math.abs(p.dueDays) + "h lewat" : p.dueDays + "h"}
                </td>
                <td>
                  <Pill tone={priorityMap[p.priority].tone} dot={false}>
                    {priorityMap[p.priority].label}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* E. Funding / Facilities ----------------------------------------------- */
export function FundingPanel({ facilities, onExpand }: { facilities: Facility[]; onExpand: () => void }) {
  return (
    <Panel tag="PENDANAAN" title="Funding & Facilities" sub="fasilitas bank" accent="var(--navy-600)" onExpand={onExpand}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
        {facilities.map((f) => {
          const usedPct = f.plafond > 0 ? Math.round((f.used / f.plafond) * 100) : 0;
          return (
            <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <Pill tone="neutral" dot={false}>
                  {f.type}
                </Pill>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{f.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: usedPct > 90 ? "var(--bad)" : usedPct > 75 ? "var(--warn)" : "var(--green-700)" }}>
                  {usedPct}%
                </span>
              </div>
              <Bar value={usedPct} tone={f.status} />
              <div style={{ display: "flex", gap: 14, fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                <span>Terpakai {rp(f.used)}</span>
                <span>Plafond {rp(f.plafond)}</span>
                <span style={{ marginLeft: "auto" }}>{f.rate ? f.rate + "% · " + f.tenor : f.tenor}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* F + G. AI Insights & Critical Decision -------------------------------- */
export function AiDecisionPanel({
  insights,
  decisions,
  onExpand,
}: {
  insights: AIInsight[];
  decisions: Decision[];
  onExpand: () => void;
}) {
  return (
    <Panel tag="AI" title="AI Insights & Decision" sub="apa yang diwaspadai hari ini" accent="var(--navy-600)" onExpand={onExpand}>
      <div className="ai-list" style={{ maxHeight: "52%", flex: "0 1 auto" }}>
        {insights.slice(0, 4).map((a, i) => (
          <div className={`ai-card ${a.tone}`} key={i}>
            <span className="ai-ico">
              <Icon name={a.icon} size={15} />
            </span>
            <div className="ai-tx">
              <div className="ai-ty">{a.type}</div>
              <div className="ai-ms">{a.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: ".04em",
          margin: "11px 0 7px",
        }}
      >
        Critical Decision Box
      </div>
      <div className="dec-box" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {decisions.map((d, i) => (
          <div className={`dec ${d.tone}`} key={i}>
            <span className="drole">{d.role}</span>
            <span className="dtx">{d.text}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
