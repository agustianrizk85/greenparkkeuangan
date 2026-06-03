import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardData, Project, Summary } from "./types";
import { api } from "./api/client";
import { useAuth } from "./hooks/useAuth";
import type { Auth } from "./hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
import { useScale } from "./hooks/useScale";
import { useLogo } from "./hooks/useLogo";
import { Clock } from "./components/Clock";
import { Icon } from "./components/Icon";
import { Login } from "./components/Login";
import { Admin } from "./components/admin/Admin";
import {
  AiDecisionPanel,
  CashflowPanel,
  FundingPanel,
  KpiRow,
  PayablePanel,
  ProjectPanel,
  ReceivablePanel,
} from "./components/panels";
import { FOCUS_META, ProjectDetail } from "./components/focus";

interface TabDef {
  id: string;
  label: string;
  icon: string;
  alert?: boolean;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "project", label: "Proyek P&L", icon: "building" },
  { id: "receivable", label: "Piutang", icon: "receipt", alert: true },
  { id: "payable", label: "Hutang", icon: "wallet" },
  { id: "cost", label: "Struktur Biaya", icon: "pie" },
  { id: "funding", label: "Pendanaan", icon: "bank" },
  { id: "ai", label: "AI & Decision", icon: "cpu" },
  { id: "kpi", label: "KPI", icon: "trend" },
  { id: "triggers", label: "Early Warning", icon: "filter" },
];

type Modal = { kind: "focus"; key: string } | { kind: "project"; p: Project };

export function App() {
  const auth = useAuth();

  if (auth.status === "checking") {
    return (
      <Splash>
        <div className="spinner" />
        Memeriksa sesi…
      </Splash>
    );
  }
  if (auth.status === "anon") {
    return <Login onLogin={auth.login} />;
  }
  return <AuthedApp auth={auth} />;
}

function AuthedApp({ auth }: { auth: Auth }) {
  useScale();
  const [state, reload] = useDashboard(auth.expire);
  const [view, setView] = useState<"dash" | "admin">("dash");

  if (state.status === "loading") {
    return (
      <Splash>
        <div className="spinner" />
        Memuat data finance…
      </Splash>
    );
  }
  if (state.status === "error") {
    return (
      <Splash tone="error">
        <div className="splash-title">Gagal memuat data</div>
        <div className="splash-msg">{state.error}</div>
        <div className="splash-msg">API: {api.base}</div>
        <button className="splash-btn" onClick={reload}>
          Coba lagi
        </button>
      </Splash>
    );
  }

  const isAdmin = auth.user?.role === "admin";
  if (view === "admin" && isAdmin) {
    return (
      <>
        <AdminHeader auth={auth} onBack={() => setView("dash")} />
        <Admin data={state.data} reload={reload} />
      </>
    );
  }
  return <Dashboard D={state.data} auth={auth} onOpenAdmin={isAdmin ? () => setView("admin") : undefined} />;
}

function Splash({ tone, children }: { tone?: "error"; children: ReactNode }) {
  return <div className={`splash ${tone ?? ""}`}>{children}</div>;
}

function Tools({ auth, onOpenAdmin, onBack }: { auth: Auth; onOpenAdmin?: () => void; onBack?: () => void }) {
  return (
    <div className="hdr-tools">
      {onBack && (
        <button className="hdr-tool-btn" onClick={onBack}>
          ← Dashboard
        </button>
      )}
      {onOpenAdmin && (
        <button className="hdr-tool-btn" onClick={onOpenAdmin}>
          ⚙ Master Data
        </button>
      )}
      <span className="hdr-user">
        {auth.user?.name}
        <small>{auth.user?.role}</small>
      </span>
      <button className="hdr-tool-btn ghost" onClick={() => void auth.logout()}>
        Logout
      </button>
    </div>
  );
}

function AdminHeader({ auth, onBack }: { auth: Auth; onBack: () => void }) {
  return (
    <header className="hdr">
      <div className="hdr-logo">
        <span>
          Master
          <br />
          Data
        </span>
      </div>
      <div className="hdr-titles">
        <h1>MASTER DATA · INPUT &amp; KELOLA</h1>
        <div className="sub">Perubahan langsung tampil di dashboard setelah disimpan</div>
        <div className="tag">FINANCE GREENPARK GROUP</div>
      </div>
      <span className="hdr-spacer" />
      <div className="hdr-meta">
        <Tools auth={auth} onBack={onBack} />
      </div>
    </header>
  );
}

function Dashboard({ D, auth, onOpenAdmin }: { D: DashboardData; auth: Auth; onOpenAdmin?: () => void }) {
  const [logo, onLogoDrop] = useLogo();
  const [tab, setTab] = useState<string>(() => localStorage.getItem("gp_fin_tab") ?? "overview");
  const [filter, setFilter] = useState<string>("all");
  const [modal, setModal] = useState<Modal | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("gp_fin_tab", tab);
    } catch {
      /* ignore storage errors */
    }
  }, [tab]);

  // Filtered data set (by project) — derived KPIs recomputed client-side.
  const data: DashboardData = useMemo(() => {
    if (filter === "all") return D;
    const proj = D.projects.find((p) => p.id === filter);
    const projects = D.projects.filter((p) => p.id === filter);
    const name = proj ? proj.name : "";
    const receivables = D.receivables.filter((r) => r.project === name);
    const payables = D.payables.filter((p) => p.project === name);
    const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
    const collected = projects.reduce((sum, p) => sum + p.collected, 0);
    const weightedMargin = projects.reduce((sum, p) => sum + p.margin * p.revenue, 0);
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
    const outstandingAR = receivables.reduce((sum, r) => sum + r.amount, 0);
    const outstandingAP = payables.reduce((sum, p) => sum + p.amount, 0);
    const critical = receivables.filter((r) => r.bucket === "d90").length;
    const summary: Summary = {
      ...D.summary,
      totalRevenue,
      collected,
      collectionRate: totalRevenue ? Math.round((collected / totalRevenue) * 100) : 0,
      outstandingAR,
      outstandingAP,
      netMargin: totalRevenue ? Math.round(weightedMargin / totalRevenue) : 0,
      budgetAbsorption: totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0,
      critical,
    };
    return {
      ...D,
      projects,
      receivables: receivables.length ? receivables : D.receivables,
      payables: payables.length ? payables : D.payables,
      summary,
    };
  }, [filter, D]);

  const openFocus = (key: string) => setModal({ kind: "focus", key });
  const openProject = (p: Project) => setModal({ kind: "project", p });

  return (
    <>
      <Header logo={logo} onLogoDrop={onLogoDrop} auth={auth} onOpenAdmin={onOpenAdmin} />
      <Tabs tab={tab} setTab={setTab} data={D} filter={filter} setFilter={setFilter} critical={data.summary.critical} />
      <div className="body">
        {tab === "overview" ? (
          <Overview data={data} openFocus={openFocus} openProject={openProject} />
        ) : (
          <FocusBody tabKey={tab} data={data} />
        )}
      </div>
      {modal && <ModalView modal={modal} data={data} onClose={() => setModal(null)} />}
    </>
  );
}

function Header({
  logo,
  onLogoDrop,
  auth,
  onOpenAdmin,
}: {
  logo: string;
  onLogoDrop: (e: React.DragEvent) => void;
  auth: Auth;
  onOpenAdmin?: () => void;
}) {
  return (
    <header className="hdr">
      <div
        className="hdr-logo"
        onDrop={onLogoDrop}
        onDragOver={(e) => e.preventDefault()}
        title="Drag & drop logo Greenpark"
      >
        {logo ? (
          <img src={logo} alt="logo" />
        ) : (
          <span>
            Drop
            <br />
            Logo
          </span>
        )}
      </div>
      <div className="hdr-titles">
        <h1>DASHBOARD FINANCE GREENPARK GROUP</h1>
        <div className="sub">One Page CEO Financial Control Dashboard — Cash &amp; Margin Guard System</div>
        <div className="tag">ONE TEAM · ONE SYSTEM · ONE DASHBOARD · ONE GOAL</div>
      </div>
      <span className="hdr-spacer" />
      <div className="hdr-meta">
        <div className="legend">
          <span className="lg">
            <span className="dot ok" />
            Sehat
          </span>
          <span className="lg">
            <span className="dot warn" />
            Waspada
          </span>
          <span className="lg">
            <span className="dot bad" />
            Kritis
          </span>
        </div>
        <Clock />
        <Tools auth={auth} onOpenAdmin={onOpenAdmin} />
      </div>
    </header>
  );
}

function Tabs({
  tab,
  setTab,
  data,
  filter,
  setFilter,
  critical,
}: {
  tab: string;
  setTab: (t: string) => void;
  data: DashboardData;
  filter: string;
  setFilter: (f: string) => void;
  critical: number;
}) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} size={15} />
          {t.label}
          {t.id === "receivable" && <span className="cnt alert">{critical}</span>}
        </button>
      ))}
      <span className="tabs-spacer" />
      <select className="filter" value={filter} onChange={(e) => setFilter(e.target.value)} title="Filter proyek">
        <option value="all">▾ Semua Proyek</option>
        {data.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </nav>
  );
}

function Overview({
  data,
  openFocus,
  openProject,
}: {
  data: DashboardData;
  openFocus: (key: string) => void;
  openProject: (p: Project) => void;
}) {
  return (
    <>
      <KpiRow s={data.summary} />
      <div className="grid">
        <CashflowPanel trend={data.cashflowTrend} onExpand={() => openFocus("cashflow")} />
        <ProjectPanel projects={data.projects} onExpand={() => openFocus("project")} onRow={openProject} />
        <ReceivablePanel
          receivables={data.receivables}
          agingMap={data.agingMap}
          typeMap={data.receivableTypeMap}
          onExpand={() => openFocus("receivable")}
        />
        <PayablePanel payables={data.payables} priorityMap={data.priorityMap} onExpand={() => openFocus("payable")} />
        <FundingPanel facilities={data.facilities} onExpand={() => openFocus("funding")} />
        <AiDecisionPanel insights={data.aiInsights} decisions={data.decisions} onExpand={() => openFocus("ai")} />
      </div>
    </>
  );
}

function FocusBody({ tabKey, data }: { tabKey: string; data: DashboardData }) {
  const meta = FOCUS_META[tabKey];
  if (!meta) return null;
  return (
    <div className="panel" style={{ flex: 1, minHeight: 0 }}>
      <header className="panel-hd">
        <span className="ptag">{meta.tag}</span>
        <span className="ptitle">{meta.title}</span>
        <span className="psub">· {meta.sub}</span>
      </header>
      <div className="panel-bd scroll" style={{ gap: 18 }}>
        {meta.render(data)}
      </div>
    </div>
  );
}

function ModalView({ modal, data, onClose }: { modal: Modal; data: DashboardData; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  let title: string;
  let sub: string;
  let content: ReactNode;
  if (modal.kind === "project") {
    title = modal.p.name;
    sub = "Project P&L deep-dive · " + modal.p.pic;
    content = <ProjectDetail p={modal.p} />;
  } else {
    const m = FOCUS_META[modal.key];
    title = m.title;
    sub = m.sub;
    content = m.render(data);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-hd">
          <h2>{title}</h2>
          <span className="mh-sub">{sub}</span>
          <span className="mh-sp" />
          <button className="mclose" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-bd">{content}</div>
      </div>
    </div>
  );
}
