import type {
  AIInsight,
  Alert,
  BankFin,
  Decision,
  MonthPoint,
  PayMethod,
  PipelineRow,
  ProjectFin,
  SalesRank,
  Summary,
} from "../types";
import { rp, toneClass } from "../lib/status";
import { Bar, Kpi, Panel, Pill, Stat } from "./ui";
import type { CardInfo } from "./ui";
import { MonthlyChart } from "./CashflowChart";

const num = (n: number) => n.toLocaleString("id-ID");

/* ---- Card tooltips: where each card's data comes from + the business
 *      process it represents (shown via the ⓘ marker on every card). ------ */
const INFO: Record<string, CardInfo> = {
  nilaiAkad: {
    source: "Total plafon KPR dari semua transaksi berstatus AKAD pada sheet 'Rekap Penjualan & Akad', ditarik backend keuangan (:8084).",
    process: "Akad = penandatanganan kredit/serah terima unit. Plafon = total pembiayaan yang sudah resmi akad.",
  },
  cashIn: {
    source: "Akumulasi kolom DP (uang muka) dari data booking/akad di sheet.",
    process: "DP dibayar konsumen saat booking → kas masuk perusahaan sebelum pencairan KPR.",
  },
  akad: {
    source: "Jumlah unit berstatus AKAD vs target akad tahun fokus (config backend).",
    process: "Pencapaian penjualan final (akad) terhadap target tahun berjalan.",
  },
  booking: {
    source: "Jumlah booking yang masih berjalan (belum akad & belum batal); nilainya ≈ potensi pipeline.",
    process: "Booking = konsumen pesan unit + bayar DP, menunggu proses KPR hingga akad.",
  },
  cancel: {
    source: "Persentase booking berstatus batal terhadap total booking.",
    process: "Mengukur kebocoran funnel — booking yang gagal lanjut ke akad.",
  },
  kprShare: {
    source: "Porsi akad berskema KPR (vs cash) + jumlah bank penyalur, dari kolom cara bayar.",
    process: "Seberapa besar penjualan dibiayai bank KPR.",
  },
  monthly: {
    source: "Data akad diagregasi per bulan akad (nilai plafon & cash-in DP) dari sheet.",
    process: "Memantau laju akad dan DP bulanan untuk melihat tren & musiman.",
  },
  project: {
    source: "Transaksi akad/booking dikelompokkan per proyek (kode GP) dari sheet.",
    process: "Membandingkan performa penjualan & akad antar proyek perumahan.",
  },
  bank: {
    source: "Akad berskema KPR dikelompokkan per bank penyalur (kolom bank).",
    process: "Melihat konsentrasi pembiayaan & ketergantungan pada tiap bank mitra.",
  },
  sales: {
    source: "Nilai & jumlah akad dikelompokkan per sales/agent dari kolom sales pada sheet.",
    process: "Ranking kontribusi tiap sales/agent terhadap akad.",
  },
  payMix: {
    source: "Komposisi cara bayar (KPR / Cash Keras / Cash Bertahap) dari data akad.",
    process: "Bauran metode pembayaran konsumen — dasar proyeksi kas & risiko.",
  },
  pipeline: {
    source: "Booking aktif beserta tahap & kendala (berkas, proses bank, dll.) dari sheet; SLA dihitung backend.",
    process: "Deteksi dini booking yang macet menuju akad agar bisa segera ditindak.",
  },
  alert: {
    source: "Peringatan otomatis dari ambang/threshold yang dihitung backend atas data dashboard.",
    process: "Notifikasi kondisi keuangan yang perlu tindakan (mis. rasio batal tinggi).",
  },
  ai: {
    source: "Insight & rekomendasi yang dihasilkan backend dari ringkasan data keuangan.",
    process: "Ringkasan war-room sebagai bahan pengambilan keputusan per peran.",
  },
};

/** Compact empty placeholder for a panel with no data yet. */
function Empty({ label }: { label: string }) {
  return <div className="empty-mini">{label}</div>;
}

/* ---- Top scorecard ---------------------------------------------------- */
export function KpiRow({ s }: { s: Summary }) {
  const cancelTone = s.cancelRate > 20 ? "bad" : s.cancelRate > 10 ? "warn" : "ok";
  const achTone = s.achievement >= 95 ? "ok" : s.achievement >= 80 ? "warn" : "bad";
  return (
    <div className="kpi-row">
      <Kpi label="Nilai Akad (Plafon)" value={rp(s.nilaiAkad)} tone="ok" info={INFO.nilaiAkad} />
      <Kpi label="Cash-in DP" value={rp(s.cashIn)} info={INFO.cashIn} />
      <Kpi label="Akad" value={num(s.akadCount)} unit={s.targetAkad ? `/ ${num(s.targetAkad)}` : ""} tone={achTone} delta={s.targetAkad ? `${s.achievement}%` : undefined} info={INFO.akad} />
      <Kpi label="Booking Aktif" value={num(s.bookingCount)} unit={`≈ ${rp(s.pipelineValue)}`} tone="warn" info={INFO.booking} />
      <Kpi label="Rasio Batal" value={`${s.cancelRate}%`} tone={cancelTone} info={INFO.cancel} />
      <Kpi label="KPR Share" value={`${s.kprShare}%`} unit={`${s.bankCount} bank`} info={INFO.kprShare} />
    </div>
  );
}

/* ---- Monthly akad trend ---------------------------------------------- */
export function MonthlyPanel({ monthly, onExpand }: { monthly: MonthPoint[]; onExpand?: () => void }) {
  return (
    <Panel tag="TREN" title="Akad per Bulan" sub="nilai (—) vs DP (- -), Rp miliar" info={INFO.monthly} onExpand={onExpand}>
      <MonthlyChart monthly={monthly} />
    </Panel>
  );
}

/* ---- Projects --------------------------------------------------------- */
export function ProjectPanel({
  projects,
  onExpand,
  onRow,
}: {
  projects: ProjectFin[];
  onExpand?: () => void;
  onRow?: (p: ProjectFin) => void;
}) {
  return (
    <Panel tag="PROYEK" title="Akad per Proyek" sub={`${projects.length} proyek`} info={INFO.project} onExpand={onExpand}>
      {projects.length === 0 ? (
        <Empty label="Belum ada data proyek." />
      ) : (
        <div className="rows">
          {projects.slice(0, 7).map((p) => (
            <button className="row click" key={p.code} onClick={() => onRow?.(p)}>
              <span className="row-name">{p.name}</span>
              <span className="row-sub">{p.akad} akad · {p.kprPct}% KPR</span>
              <span className="row-val">{rp(p.nilai)}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---- Banks (Pendanaan) ------------------------------------------------ */
export function BankPanel({ banks, onExpand }: { banks: BankFin[]; onExpand?: () => void }) {
  const max = banks[0]?.plafon || 1;
  return (
    <Panel tag="PENDANAAN" title="Plafond KPR per Bank" sub={`${banks.length} bank`} info={INFO.bank} onExpand={onExpand}>
      {banks.length === 0 ? (
        <Empty label="Belum ada akad KPR." />
      ) : (
        <div className="rows">
          {banks.slice(0, 6).map((b) => (
            <div className="row" key={b.name}>
              <span className="row-name">{b.name}</span>
              <Bar value={b.plafon} max={max} tone="green" />
              <span className="row-sub">{b.share}% · {b.akad} akad</span>
              <span className="row-val">{rp(b.plafon)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---- Sales ranking ---------------------------------------------------- */
export function SalesPanel({ sales, onExpand }: { sales: SalesRank[]; onExpand?: () => void }) {
  return (
    <Panel tag="SALES" title="Kontribusi Akad — Sales" sub={`${sales.length} kontributor`} info={INFO.sales} onExpand={onExpand}>
      {sales.length === 0 ? (
        <Empty label="Belum ada data sales." />
      ) : (
        <div className="rows">
          {sales.slice(0, 7).map((s, i) => (
            <div className="row" key={s.name + i}>
              <span className="row-rank">{i + 1}</span>
              <span className="row-name">
                {s.name} {s.isAgent && <Pill tone="orange" dot={false}>Agent</Pill>}
              </span>
              <span className="row-sub">{s.akad} akad</span>
              <span className="row-val">{rp(s.nilai)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---- Payment mix ------------------------------------------------------ */
export function PayMixPanel({ payMix, onExpand }: { payMix: PayMethod[]; onExpand?: () => void }) {
  const total = payMix.reduce((a, p) => a + p.count, 0) || 1;
  const tone = (t: string) => (t === "KPR" ? "green" : t === "Cash Keras" ? "yellow" : "orange");
  return (
    <Panel tag="CARA BAYAR" title="Skema Pembayaran" sub={`${num(total)} akad`} info={INFO.payMix} onExpand={onExpand}>
      {payMix.length === 0 ? (
        <Empty label="Belum ada data." />
      ) : (
        <div className="rows">
          {payMix.map((p) => (
            <div className="row" key={p.type}>
              <Pill tone={tone(p.type)} dot>{p.type}</Pill>
              <Bar value={p.count} max={total} tone={p.type === "KPR" ? "green" : "yellow"} />
              <span className="row-sub">{Math.round((p.count / total) * 100)}%</span>
              <span className="row-val">{num(p.count)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---- Pipeline early-warning ------------------------------------------ */
const SLA_TONE = { overdue: "red", due: "yellow", ok: "green" } as const;

export function PipelinePanel({ pipeline, onExpand }: { pipeline: PipelineRow[]; onExpand?: () => void }) {
  pipeline = pipeline ?? [];
  const flagged = pipeline.filter((r) => r.kendala).length;
  return (
    <Panel tag="EARLY WARNING" title="Pipeline Tertahan" sub={`${flagged} berkendala`} accent="var(--bad)" info={INFO.pipeline} onExpand={onExpand}>
      {pipeline.length === 0 ? (
        <Empty label="Tidak ada booking aktif tertahan." />
      ) : (
        <div className="rows">
          {pipeline.slice(0, 7).map((r, i) => (
            <div className="row" key={r.customer + i}>
              <Pill tone={SLA_TONE[r.sla]} dot>{r.stage}</Pill>
              <span className="row-name">{r.customer}</span>
              <span className="row-sub">{r.project} · {r.bank || r.caraBayar}</span>
              <span className="row-note">{r.kendala || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---- AI + decisions --------------------------------------------------- */
export function AiDecisionPanel({
  insights,
  decisions,
  onExpand,
}: {
  insights: AIInsight[];
  decisions: Decision[];
  onExpand?: () => void;
}) {
  return (
    <Panel tag="AI" title="AI Insight & Keputusan" sub="war-room" info={INFO.ai} onExpand={onExpand}>
      <div className="ai-list">
        {insights.slice(0, 4).map((a, i) => (
          <div className="ai-item" key={i}>
            <Pill tone={toneClass(a.tone)} dot>{a.type}</Pill>
            <span className="ai-text">{a.text}</span>
          </div>
        ))}
      </div>
      {decisions.length > 0 && (
        <div className="dec-list">
          {decisions.slice(0, 4).map((d, i) => (
            <div className="dec-item" key={i}>
              <span className="dec-role">{d.role}</span>
              <span className="dec-text">{d.text}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---- Alerts ----------------------------------------------------------- */
export function AlertPanel({ alerts, onExpand }: { alerts: Alert[]; onExpand?: () => void }) {
  return (
    <Panel tag="ALERT" title="Alarm Keuangan" sub={`${alerts.length}`} accent="var(--bad)" info={INFO.alert} onExpand={onExpand}>
      <div className="alert-list">
        {alerts.map((a, i) => (
          <div className={`alert-item ${a.tone}`} key={i}>
            <div className="alert-h">
              <Pill tone={toneClass(a.tone)} dot>{a.title}</Pill>
            </div>
            <div className="alert-detail">{a.detail}</div>
            <div className="alert-action">→ {a.action}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* Re-export Stat for focus views. */
export { Stat };
