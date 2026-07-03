import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { PRResult, Purchasing } from "../../types";
import { rp } from "../../lib/status";

const num = (n: number) => n.toLocaleString("id-ID");

/**
 * Independent async ingest for the procurement (Pembelian / PR) section, mirroring
 * the akad Sync flow: configure the "Pembelian (PR)" spreadsheet → Sync Preview →
 * Approve. Fully decoupled from the akad sync — refreshing pembelian never touches
 * the akad dashboard (same pattern as the AR/piutang sync).
 */
export function PurchasingPanel({ reload }: { reload: () => void }) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [current, setCurrent] = useState<Purchasing | null>(null);
  const [result, setResult] = useState<PRResult | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "preview" | "approve">("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api
      .prSheetGet()
      .then((c) => {
        setSheetUrl(c.url);
        setSavedUrl(c.url);
      })
      .catch(() => {});
    api.purchasing().then(setCurrent).catch(() => {});
  }, []);

  function clearMsg() {
    setError("");
    setOk("");
  }

  async function saveSheet() {
    setBusy("save");
    clearMsg();
    try {
      const c = await api.prSheetSet(sheetUrl);
      setSheetUrl(c.url);
      setSavedUrl(c.url);
      setOk("Spreadsheet Pembelian tersimpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function preview() {
    setBusy("preview");
    clearMsg();
    try {
      setResult(await api.purchasingSyncPreview());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function approve() {
    setBusy("approve");
    clearMsg();
    try {
      const pur = await api.purchasingSyncApprove();
      setCurrent(pur);
      setResult(null);
      setOk("Data pembelian diperbarui. Dashboard ikut berubah.");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const s = result?.purchasing.summary ?? current?.summary;
  const updated = current?.updated;

  return (
    <div className="imp">
      <div className="adm-section-h">
        <div>
          <h2 className="imp-title">Sinkronisasi Pembelian (PR)</h2>
          <p className="imp-sub">
            Alur: <b>Set Spreadsheet → Sync Google Sheets → Preview → Approve</b>. Nilai PO, faktur,
            pembayaran, hutang ke pemasok, dan tren pengadaan dihitung otomatis dari spreadsheet
            <b> Pembelian (PR)</b> (tab Pesanan / Faktur / Pembayaran). Terpisah dari sync akad.
            {updated && <span className="imp-sub-stamp"> · Terakhir disinkron: {updated}</span>}
          </p>
        </div>
      </div>

      <div className="imp-sheetcfg">
        <input
          type="text"
          className="imp-sheet-in"
          placeholder="URL Google Sheets Pembelian (PR) atau ID spreadsheet"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
        />
        <button
          className="adm-btn ghost"
          disabled={busy !== "" || sheetUrl === savedUrl}
          onClick={saveSheet}
        >
          {busy === "save" ? "Menyimpan…" : "Simpan Sheet"}
        </button>
      </div>

      <div className="imp-drop">
        <button className="adm-btn primary imp-sync" disabled={busy !== ""} onClick={preview}>
          {busy === "preview" ? "Menarik dari Sheets…" : "🔄 Sync & Preview Pembelian"}
        </button>
      </div>

      {error && <div className="adm-error">{error}</div>}
      {ok && <div className="adm-ok">{ok}</div>}

      {s && (
        <div className="imp-grid">
          <ImpCard title="Pengadaan (PO & Faktur)">
            <Metric label="Nilai PO" value={rp(s.poValue)} strong />
            <Metric label="Jumlah PO" value={num(s.poCount)} />
            <Metric label="Nilai Faktur" value={rp(s.invoiceValue)} />
            <Metric label="Jumlah Faktur" value={num(s.invoiceCount)} />
          </ImpCard>
          <ImpCard title="Pembayaran & Hutang">
            <Metric label="Total Dibayar" value={rp(s.paidValue)} strong />
            <Metric label="Hutang (Terutang)" value={rp(s.outstanding)} strong />
            <Metric label="Jumlah Pemasok" value={num(s.supplierCount)} />
            <Metric label="Pemasok Terbesar" value={s.topSupplier || "—"} />
          </ImpCard>
        </div>
      )}

      {result && (
        <>
          <div className="imp-rows">
            {result.sheets.map((sh) => (
              <span key={sh.name} className={"imp-chip imp-chip-" + sh.kind}>
                {sh.name}: <b>{sh.kind}</b>
                {sh.rows ? ` · ${num(sh.rows)} baris` : ""}
              </span>
            ))}
          </div>

          {result.issues.length > 0 && (
            <div className="imp-issues">
              {result.issues.slice(0, 200).map((m, idx) => (
                <div key={idx} className="imp-issue warning">
                  <span className="imp-issue-msg">{m}</span>
                </div>
              ))}
            </div>
          )}

          <div className="imp-actions">
            <button className="adm-btn primary" disabled={busy !== ""} onClick={approve}>
              {busy === "approve" ? "Mengupdate…" : "Approve & Update Pembelian"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ImpCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="imp-panel">
      <div className="imp-panel-h">{title}</div>
      <div className="imp-panel-b">{children}</div>
    </div>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="imp-metric">
      <span className="imp-metric-l">{label}</span>
      <span className={"imp-metric-v" + (strong ? " strong" : "")}>{value}</span>
    </div>
  );
}
