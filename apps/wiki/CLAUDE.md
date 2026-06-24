# CLAUDE.md — Aurora Wiki (demo Donq)

Guida per chi (incluso un futuro agente) deve rilavorare su questo progetto avendo già la base
di conoscenza, le scelte architetturali e i "trabocchetti" già noti.

> **Monorepo**: questa app vive in `apps/wiki/` di un workspace pnpm. La logica di **sicurezza**
> (sessione, rate-limit per-IP, budget globale, sessioni concorrenti, Turnstile, helper HTTP) è
> estratta nel pacchetto condiviso **`@donq/security`** (`packages/security/`), con chiavi Redis e
> cookie **prefissati da `APP_NAMESPACE`** (qui `wiki`). Dove sotto si citano
> `lib/redis|session|rateLimit|budget|turnstile|http`, ora si importa da `@donq/security`. La seconda
> demo è `apps/finance` (`APP_NAMESPACE=finance`), con limiti segregati. La parte LLM/OpenRouter resta
> locale all'app (`lib/llm.ts`).

## 1. Cos'è
Demo da far provare ai clienti **Donq**: una **chat documentale** su una PMI manifatturiera inventata
("Officine Meccaniche Aurora S.r.l."). L'utente fa domande, ottiene risposte **con le fonti citate** e
naviga le **pagine collegate** anche tramite un **knowledge graph** interattivo. UI allineata al brand
donq.io (font Unbounded/Sora, palette monocromatica + accenti pastello).

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind v4 + Framer Motion**, Redis (sicurezza),
OpenRouter (LLM a runtime). Package manager: **pnpm**.

## 2. Architettura: LLM Wiki (metodologia Karpathy) — NON è un RAG classico
Tre livelli:
1. `content/raw/` — sorgenti immutabili (documenti aziendali grezzi). Verità di base, sola lettura.
2. `content/wiki/` — pagine markdown **interconnesse, scritte dall'agente** (vedi §7): `sources/`,
   `concepts/`, `entities/` + `index.md`, `log.md`. Si collegano con wikilink `[[id|testo]]`.
3. `content/WIKI_SCHEMA.md` — le convenzioni (= il "CLAUDE.md" della metodologia originale).

Pipeline:
- **Ingest** = l'**agente** legge `raw/` e scrive `wiki/` seguendo lo schema. **NON c'è una pipeline a
  chiamate LLM/API per costruire il wiki** (vedi §8, lezione appresa).
- **Derivazione grafo** = `scripts/wiki-graph.ts` legge `content/wiki/**` e genera `content/graph.json`
  (nodi = pagine, archi = `[[link]]`). Gira **in automatico** in `predev`/`prebuild`. Nessun LLM.
- **Query (runtime)** = `lib/retrieval.ts` seleziona le pagine d'ingresso (BM25) + espande sui
  collegamenti del grafo; `lib/wiki-answer.ts` chiede all'LLM una risposta che **cita le pagine**.

## 3. Provider LLM: OpenRouter (solo a runtime)
- Client unico: `lib/llm.ts` (SDK `openai` puntato a `https://openrouter.ai/api/v1`).
- Modello default: **`google/gemini-2.5-flash`** (veloce/economico). Env: `OPENROUTER_MODEL`.
- Usato **solo** per rispondere in chat (`/api/chat`). La costruzione del wiki non usa l'API.
- ⚠️ **Gli header HTTP devono essere ASCII**: un em-dash (—) in `X-Title` faceva fallire `fetch` di
  undici con "Connection error". Tenere `X-Title`/`HTTP-Referer` in ASCII puro.

## 4. Flusso di una domanda (`app/api/chat/route.ts`)
Controlli in cascata (in quest'ordine): sessione firmata valida → input valido (lunghezza) →
heartbeat sessione + limite concorrenza → **rate limit per IP** → **budget globale giornaliero** →
config (chiave OpenRouter) → retrieval → **streaming** risposta (NDJSON).
Protocollo NDJSON: eventi `{type:"meta"|"token"|"citations"|"done"|"error"}`. La risposta dell'LLM è
testo + marcatore `<<<CITAZIONI>>>` + array JSON di citazioni; il server lo splitta e arricchisce le
citazioni (valida pageId, calcola le pagine collegate dal grafo).

## 5. Sicurezza — modello di minaccia e difese
| Difesa | Dove | Note |
|---|---|---|
| Rate limit **10 domande / 30 min** | `lib/rateLimit.ts` (sliding window Redis) | **chiave = IP** (persiste a refresh e a cancellazione cookie). |
| **Budget globale giornaliero** | `lib/budget.ts` | limite "hard" anti-drain crediti su TUTTA l'app. **È il vero backstop** se l'IP è falsificabile. |
| **Sessioni concorrenti** | `lib/budget.ts` | set Redis con TTL/heartbeat, chiave = `sid`. |
| **Anti-bot Turnstile** | `lib/turnstile.ts` | verificato server-side all'avvio sessione. In prod, se le chiavi mancano → blocca. |
| **Sessione firmata** (HMAC) | `lib/session.ts` | cookie httpOnly, SameSite=Strict, Secure in prod. |
| **SESSION_SECRET guard** | `lib/env.ts` `insecureSessionSecret` | in prod blocca se segreto = default o < 16 char. |
| **Anti-XSS markdown** | `components/Markdown.tsx` `urlTransform` | preserva `wiki:`, consente solo http/https/mailto/tel/relativi, blocca `javascript:`/`data:`. |
| max_tokens risposta | `LLM_MAX_TOKENS` | limita il costo per chiamata. |
| Chiave OpenRouter | solo server | mai nel bundle client. |

**Punti di attenzione noti** (accettabili per una demo, ma da sapere):
- `getClientIp` (`lib/http.ts`) si fida di `x-forwarded-for`: **in produzione serve un reverse proxy
  che sovrascrive quell'header** (es. nginx), altrimenti il rate-limit per-IP è aggirabile. Il budget
  globale resta il limite hard sui crediti.
- Rate-limit/budget vengono **consumati prima** della chiamata LLM (fail-closed sui crediti): se
  OpenRouter fallisce, la domanda è comunque conteggiata.
- Se Redis è irraggiungibile, le route falliscono (fail-closed): nessun consumo di crediti, ma demo
  inutilizzabile finché Redis non torna.

## 6. Comandi
```bash
pnpm install
docker compose up -d        # Redis su localhost:6379
pnpm dev                    # http://localhost:3000 (rigenera graph.json dalle pagine)
pnpm wiki:graph             # rigenera solo content/graph.json dalle pagine wiki
pnpm wiki:lint              # health check: orfani, link non risolti, pagine senza summary
pnpm build && pnpm start    # produzione
```
Env: vedere `.env.example`. Obbligatorie: `OPENROUTER_API_KEY`, `SESSION_SECRET` (≥16 char in prod),
`REDIS_URL`. Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`) opzionale in dev,
**obbligatorio in prod**.

## 7. Convenzioni del wiki (per costruire/estendere le pagine)
- Ogni pagina sta in `content/wiki/{sources|concepts|entities}/<id>.md`. `id` = nome file (kebab-case).
- Frontmatter consigliato: `id, type, title, category, tags, summary` (category tra: Azienda, Prodotti,
  Qualità, Sicurezza, HR, Operations, Commerciale).
- **Collegare SEMPRE con `[[id-esatto|testo]]`** dove `id` = nome file di una pagina esistente.
  `wiki-graph.ts` risolve anche per *slug* di id/titolo, ma l'id esatto è la via sicura.
- `index.md`, `log.md`, `SCHEMA.md`, `overview.md` a livello radice **NON** sono nodi del grafo
  (esclusi di proposito da `wiki-graph.ts`).
- Se manca `category` → il grafo colora **per tipo**; se manca `summary` → viene derivato dal 1° paragrafo.

## 8. Lezioni apprese (errori già fatti — NON ripeterli)
1. **Il wiki lo costruisce l'agente, non una pipeline a pagamento.** In passato è stato creato un
   `scripts/wiki-build.ts` che chiamava OpenRouter per generare le pagine → spreco di crediti. È stato
   rimosso. Le pagine si scrivono a mano seguendo `WIKI_SCHEMA.md`.
2. **Sessione**: `/api/session` deve **riusare il `sid`** dal cookie valido (non crearne uno nuovo a
   ogni richiesta) — altrimenti ogni refresh azzerava i limiti e creava sessioni concorrenti fantasma.
3. **Header HTTP ASCII** (vedi §3).
4. **`urlTransform` di react-markdown**: non disabilitare la sanitizzazione con `(url)=>url` (XSS).

## 9. Mappa file
```
app/            page (landing), wiki/page, api/session, api/chat
components/      WikiApp (orchestratore), ChatPanel, DocViewer, GraphView, Markdown, LimitModal
lib/            env, llm (OpenRouter), redis, session, rateLimit, budget, turnstile, http,
                retrieval, wiki-answer, citations, graph, slug, types
content/raw/    sorgenti immutabili
content/wiki/   pagine generate dall'agente (artefatto committato) + WIKI_SCHEMA.md
scripts/        wiki-graph (deriva graph.json), wiki-lint, load-env (per gli script tsx)
Dockerfile      immagine prod (next output standalone)
deploy/         nginx.conf (reverse proxy, sovrascrive x-forwarded-for) + docker-compose.prod.yml
DEPLOY.md       guida deploy prod + modello reverse proxy / IP affidabile
```

## 10. Note UI
- `GraphView`: grafo denso → forze tarate (repulsione forte, archi lunghi/morbidi) + **auto-fit**
  (centra/scala alla vista quando la simulazione si assesta; bottone "adatta"). Etichette solo all'hover.
- `DocViewer`: lo scroll è **confinato al contenitore** (mai `scrollIntoView`, che trascinava l'intera
  pagina) — evita il bug "pagina tagliata in alto".
- Tutto il branding/colori sono in `app/globals.css` (`@theme`).
