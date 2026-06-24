# ARCHITECTURE — Aurora/Vertex Finance (`apps/finance`)

> Leggi PRIMA il **[CLAUDE.md](../../CLAUDE.md)** della root (struttura monorepo + sicurezza condivisa).
> Questo file copre ciò che è **specifico** della demo finance. Per lo **schema del DB** vedi
> **[SCHEMA.md](SCHEMA.md)** (fonte di verità, iniettato nel prompt dell'AI).

## 1. Cosa è
Demo per clienti Donq: una **piattaforma di intelligence finanziaria** per *Vertex Group* (azienda
fittizia: gruppo retail & distribuzione multi-divisione, EUR). Due modalità d'uso complementari:

1. **Navigazione dei dati SENZA AI** — un cruscotto dark "terminal" dove l'utente esplora e incrocia i
   dati con filtri (periodo, divisione, regione, canale, segmento) muovendosi tra le sezioni.
2. **Assistente AI in chat (Vertex Copilot)** — interroga i dati in linguaggio naturale e costruisce
   analisi previsionali (forecast). È l'**unico** punto in cui interviene l'AI.

## 2. Dati (`scripts/seed-db.ts` → `data/finance.db`)
- **SQLite** via `node:sqlite` (no ORM). Seed **deterministico** (PRNG `mulberry32`, nessun servizio
  esterno) eseguito in `predev`/`prebuild`. Il file `data/*.db` è **gitignored** (rigenerabile).
- **Storico** 36 mesi `2023-07 → 2026-06`; **forecast** 18 mesi `2026-07 → 2027-12` (3 scenari).
- ~66k righe in `sales` (granularità order-line). Tabelle: vedi **SCHEMA.md**.
- Due **viste** facilitano le query: `v_sales_enriched` (vendite + tutte le dimensioni) e
  `v_pl_monthly` (conto economico mensile). **EBITDA = ricavi netti − COGS − opex.**
- ⚠️ Se cambi lo schema nel seed, **aggiorna SCHEMA.md** (l'AI ci si basa per il text-to-SQL).

## 3. Accesso ai dati (`lib/db.ts`) — sola lettura
- Query **tipizzate** per i pannelli, con filtri **parametrizzati** e colonne in **whitelist**
  (`FILTER_COLS`) → niente SQL arbitrario dai filtri UI.
- `runSafeSql(sql)`: esecutore per il text-to-SQL dell'AI. Validazione: **solo `SELECT`/`WITH`**,
  **single statement** (no `;`), blacklist di keyword di scrittura/DDL, `LIMIT` forzato (max 200 righe),
  connessione SQLite in `readOnly`.

## 4. Assistente AI "hybrid" (`lib/finance-agent.ts`)
- Provider **OpenRouter** (SDK `openai`, client in `lib/llm.ts`). Modello da `OPENROUTER_MODEL`
  (default `google/gemini-2.5-flash`; deve supportare function-calling).
- **Hybrid** = TOOL predefiniti (`get_kpis`, `get_breakdown`, `get_forecast`, `get_competitors`, …)
  con parametri validati **+** `run_sql` come fallback per domande arbitrarie.
- Lo **schema** (`SCHEMA.md`) è iniettato nel system prompt → l'agente sa scrivere SQL senza ispezionare
  le tabelle (requisito esplicito).
- Flusso: loop di tool-calling (non streaming, max `LLM_MAX_TOOL_STEPS`) per raccogliere i dati →
  risposta finale **in streaming**. Output **NDJSON**: `tool_start` / `tool_result` (mostrati in UI come
  step trasparenti, con SQL+tabella per `run_sql`) / `token` / `done` / `error`.

## 5. API routes (`app/api/*`)
| Route | AI | Sicurezza | Note |
|---|---|---|---|
| `POST /api/session` | — | Turnstile → sessione firmata → concorrenza → peek rate-limit | bootstrap (riusa il `sid` valido). |
| `POST /api/data` | no | sessione + heartbeat/concorrenza | **non** consuma budget/rate-limit: l'esplorazione dati è libera. Ritorna il bundle completo del cruscotto per i filtri. |
| `POST /api/chat` | sì | sessione + concorrenza + **rate-limit** + **budget** | cascata completa come la wiki; streaming NDJSON dell'agente. |

Limiti **segregati** via `APP_NAMESPACE=finance` (chiavi `finance:*` su Redis), vedi CLAUDE.md §3.

## 6. Front-end (dark "terminal" premium)
- Next 15 (App Router) + React 19 + **Tailwind v4** (tema dark in `app/globals.css`: griglia, glow,
  pannelli vetro). Font: Space Grotesk (display), Inter (testo), JetBrains Mono (numeri).
- **Recharts** per i grafici (wrapper tematizzati in `components/charts.tsx`), **Framer Motion** per
  micro-animazioni (entrate, count-up KPI, segmented control, drawer chat).
- Componenti: `FinanceApp.tsx` (guscio: sessione, nav sezioni, barra filtri, orchestrazione dati),
  `views.tsx` (Panoramica / Vendite / Forecast / Mercato / Persone), `ui.tsx` (primitive),
  `Chat.tsx` (drawer assistente, markdown via `react-markdown` + `remark-gfm`, sanitizzato di default).
- Tipi del payload lato client in `lib/types.ts`; formattazione/palette in `lib/format.ts`.

## 7. Comandi
```bash
pnpm dev:finance     # PORT 3002 (vedi root package.json) — auto-seed del DB
pnpm build:finance   # build (auto-seed in prebuild)
pnpm --filter @donq/finance seed   # rigenera solo data/finance.db
```
Servono **Redis** (`docker compose up -d`) e, per l'AI, `OPENROUTER_API_KEY` in `.env.local`
(senza chiave, il cruscotto funziona; la chat risponde con errore di configurazione).

## 8. Note / scelte
- Gli **opex** (`costs`) sono separati dai **COGS** (`sales.cogs`) per evitare doppi conteggi. I costi
  hanno granularità mese×divisione (la regione non è dettagliata) → i filtri per regione/canale/segmento
  agiscono su ricavi e margini ma **non** sull'opex nel calcolo dell'EBITDA filtrato (documentato in `lib/db.ts`).
- Le vendite **B2C** sono attribuite a clienti aggregati `Consumatori <regione>`; le **B2B** a clienti nominali.
- Il forecast è dato **pre-calcolato** nel DB; l'AI lo legge e lo interpreta (non lo ricalcola).
