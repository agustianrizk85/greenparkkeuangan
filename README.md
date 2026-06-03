# Finance Frontend — Greenpark Financial Control Dashboard

A single-page **CEO financial control dashboard** for Greenpark Group, built
with **React + TypeScript + Vite**. It consumes the Go API in
[`backend/finance`](../../backend/finance) and renders a fixed 1920×1080
war-room canvas that auto-scales to the viewport.

It is gated by **login** and ships a **master-data admin** (input & kelola): an
admin user can create/edit/delete every entity and the change shows on the
dashboard immediately after saving.

## Login

- **admin / admin123** — full access + the `⚙ Master Data` button (input form).
- **viewer / viewer123** — read-only dashboard.

The token is kept in `localStorage`; an expired session drops back to the login
screen automatically.

## Stack

- **React 18** + **TypeScript** (strict)
- **Vite 5** dev server / bundler
- No UI framework — hand-rolled components and a single themed stylesheet

## Run

First start the backend (defaults to `http://localhost:8084`):

```bash
cd backend/finance && go run ./cmd/server
```

Then the frontend:

```bash
cd frontend/finance
npm install
npm run dev      # http://localhost:5175
```

Scripts: `npm run dev` · `npm run build` · `npm run preview` · `npm run typecheck`.

## Configuration

Copy `.env.example` to `.env`:

| Variable        | Default                 | Description                                   |
| --------------- | ----------------------- | --------------------------------------------- |
| `VITE_PORT`     | `5175`                  | Dev/preview port (empty → dynamic free port)  |
| `VITE_API_BASE` | `http://localhost:8084` | Backend API base URL                          |

## Structure

```
src/
  api/client.ts          typed fetch wrapper (bearer token, reads + writes)
  components/            Panel/Kpi/Pill/Bar UI kit, CashflowChart, panels, focus views
  components/Login.tsx   login screen
  components/admin/      master-data admin — schema (fields per section), generic widgets, Admin shell
  hooks/                 useAuth (session), useDashboard (fetch+enrich), useScale, useLogo
  lib/status.ts          status mappings + Rupiah formatter (rp)
  types.ts               domain types mirroring the Go JSON contract
  App.tsx                shell: login gate → dashboard / admin; header, tabs, filter, modal
  styles.css             executive war-room theme + login/admin styles
```

## Master Data (input)

Open `⚙ Master Data` (admin only) to edit, grouped in a sidebar:

- **Collections** (add / edit / delete rows): Proyek P&L, Piutang (AR), Hutang (AP),
  Pendanaan/Fasilitas, KPI Scorecard, Early Warning, AI Insights, Critical Decision
- **Singletons / arrays**: Treasury (kas), Tren Arus Kas, Struktur Biaya, and the
  classification metas (tipe piutang, aging, prioritas hutang)

Every save calls the API then reloads the dashboard payload, so the new input is
reflected in the panels and the derived KPI row right away.

## Sections

Overview (KPI row + 6 panels) plus drill-down tabs/modals:

- **Proyek P&L** — budget vs cost, revenue, collection, margin per project
- **Piutang (AR)** — receivables aging by bucket, KPR/cash/DP type
- **Hutang (AP)** — payables by due date and payment priority
- **Struktur Biaya** — budget-vs-actual cost categories
- **Pendanaan** — bank/KPR/equity facilities and treasury/runway
- **AI & Decision** — generated insights and per-role critical decisions
- **KPI** — 15-indicator reference table with thresholds
- **Early Warning** — automated trigger rules and escalation paths

All amounts are shown in Rupiah, formatted from the backend's Rp-juta values
(`rp()` promotes ≥ Rp 1.000 jt to **Rp … M** / miliar).
