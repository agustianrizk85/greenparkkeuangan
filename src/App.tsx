import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Dashboard, ProjectFin } from "./types";
import { api } from "./api/client";
import { useAuth } from "./hooks/useAuth";
import type { Auth } from "./hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
import { useScale } from "./hooks/useScale";
import { useLogo } from "./hooks/useLogo";
import { Clock } from "./components/Clock";
import { Icon } from "./components/Icon";
import { Login } from "./components/Login";
import { ImportPanel } from "./components/admin/ImportPanel";
import {
  AiDecisionPanel,
  AlertPanel,
  BankPanel,
  KpiRow,
  MonthlyPanel,
  PayMixPanel,
  PipelinePanel,
  ProjectPanel,
  SalesPanel,
} from "./components/panels";
import { FOCUS_META, ProjectDetail } from "./components/focus";

interface TabDef {
  id: string;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "project", label: "Proyek", icon: "building" },
  { id: "bank", label: "Pendanaan", icon: "bank" },
  { id: "pipeline", label: "Pipeline KPR", icon: "filter" },
  { id: "cashflow", label: "Tren Akad", icon: "trend" },
  { id: "ai", label: "AI & Decision", icon: "cpu" },
  { id: "kpi", label: "KPI", icon: "trend" },
  { id: "triggers", label: "Early Warning", icon: "filter" },
];

type Modal = { kind: "focus"; key: string } | { kind: "project"; p: ProjectFin };

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
  useRealtime(reload);

  if (state.status === "loading") {
    return (
      <Splash>
        <div className="spinner" />
        Memuat data keuangan…
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
        <div className="body">
          <ImportPanel reload={reload} />
        </div>
      </>
    );
  }
  return <DashboardView D={state.data} auth={auth} onOpenAdmin={isAdmin ? () => setView("admin") : undefined} />;
}

/** Subscribe to backend revision pushes (WebSocket) and reload on change. */
function useRealtime(reload: () => void) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    const url = api.realtimeURL();
    if (!url) return;
    let ws: WebSocket | null = null;
    let timer: number | undefined;
    let closed = false;
    let lastRev = -1;
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);
      ws.onmessage = (e) => {
        try {
          const { rev } = JSON.parse(e.data) as { rev: number };
          if (lastRev >= 0 && rev !== lastRev) reloadRef.current();
          lastRev = rev;
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!closed) timer = window.setTimeout(connect, 5000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      ws?.close();
    };
  }, []);
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
          🔄 Sync / Import
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
          Sync
          <br />
          Data
        </span>
      </div>
      <div className="hdr-titles">
        <h1>SINKRONISASI DATA KEUANGAN</h1>
        <div className="sub">Sync Google Sheets / Upload Excel → Preview → Approve</div>
        <div className="tag">FINANCE GREENPARK GROUP</div>
      </div>
      <span className="hdr-spacer" />
      <div className="hdr-meta">
        <Tools auth={auth} onBack={onBack} />
      </div>
    </header>
  );
}

function DashboardView({ D, auth, onOpenAdmin }: { D: Dashboard; auth: Auth; onOpenAdmin?: () => void }) {
  const [logo, onLogoDrop] = useLogo();
  const [tab, setTab] = useState<string>(() => localStorage.getItem("gp_fin_tab") ?? "overview");
  const [modal, setModal] = useState<Modal | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("gp_fin_tab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const flagged = D.pipeline.filter((r) => r.kendala).length;
  const openFocus = (key: string) => setModal({ kind: "focus", key });
  const openProject = (p: ProjectFin) => setModal({ kind: "project", p });

  return (
    <>
      <Header logo={logo} onLogoDrop={onLogoDrop} auth={auth} onOpenAdmin={onOpenAdmin} D={D} />
      <Tabs tab={tab} setTab={setTab} pipelineAlert={flagged} />
      <div className="body">
        {tab === "overview" ? (
          <Overview D={D} openFocus={openFocus} openProject={openProject} />
        ) : (
          <FocusBody tabKey={tab} D={D} />
        )}
      </div>
      {modal && <ModalView modal={modal} D={D} onClose={() => setModal(null)} />}
    </>
  );
}

function Header({
  logo,
  onLogoDrop,
  auth,
  onOpenAdmin,
  D,
}: {
  logo: string;
  onLogoDrop: (e: React.DragEvent) => void;
  auth: Auth;
  onOpenAdmin?: () => void;
  D: Dashboard;
}) {
  return (
    <header className="hdr">
      <div className="hdr-logo" onDrop={onLogoDrop} onDragOver={(e) => e.preventDefault()} title="Drag & drop logo Greenpark">
        {logo ? <img src={logo} alt="logo" /> : <span>Drop<br />Logo</span>}
      </div>
      <div className="hdr-titles">
        <h1>DASHBOARD KEUANGAN GREENPARK GROUP</h1>
        <div className="sub">Akad &amp; KPR Control Tower — {D.period}</div>
        <div className="tag">{D.updated ? `Diperbarui: ${D.updated}` : "ONE TEAM · ONE SYSTEM · ONE DASHBOARD"}</div>
      </div>
      <span className="hdr-spacer" />
      <div className="hdr-meta">
        <div className="legend">
          <span className="lg"><span className="dot ok" />Sehat</span>
          <span className="lg"><span className="dot warn" />Waspada</span>
          <span className="lg"><span className="dot bad" />Kritis</span>
        </div>
        <Clock />
        <Tools auth={auth} onOpenAdmin={onOpenAdmin} />
      </div>
    </header>
  );
}

function Tabs({ tab, setTab, pipelineAlert }: { tab: string; setTab: (t: string) => void; pipelineAlert: number }) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} size={15} />
          {t.label}
          {t.id === "pipeline" && pipelineAlert > 0 && <span className="cnt alert">{pipelineAlert}</span>}
        </button>
      ))}
    </nav>
  );
}

function Overview({
  D,
  openFocus,
  openProject,
}: {
  D: Dashboard;
  openFocus: (key: string) => void;
  openProject: (p: ProjectFin) => void;
}) {
  return (
    <>
      <KpiRow s={D.summary} />
      <div className="grid">
        <MonthlyPanel monthly={D.monthly} onExpand={() => openFocus("cashflow")} />
        <ProjectPanel projects={D.projects} onExpand={() => openFocus("project")} onRow={openProject} />
        <BankPanel banks={D.banks} onExpand={() => openFocus("bank")} />
        <SalesPanel sales={D.sales} onExpand={() => openFocus("sales")} />
        <PayMixPanel payMix={D.payMix} />
        <PipelinePanel pipeline={D.pipeline} onExpand={() => openFocus("pipeline")} />
        <AlertPanel alerts={D.alerts} />
        <AiDecisionPanel insights={D.ai} decisions={D.decisions} onExpand={() => openFocus("ai")} />
      </div>
    </>
  );
}

function FocusBody({ tabKey, D }: { tabKey: string; D: Dashboard }) {
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
        {meta.render(D)}
      </div>
    </div>
  );
}

function ModalView({ modal, D, onClose }: { modal: Modal; D: Dashboard; onClose: () => void }) {
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
    sub = "Akad deep-dive · " + modal.p.gp;
    content = <ProjectDetail p={modal.p} />;
  } else {
    const m = FOCUS_META[modal.key];
    title = m.title;
    sub = m.sub;
    content = m.render(D);
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
