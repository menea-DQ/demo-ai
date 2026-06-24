# ARCHITECTURE.md — Aurora Wiki (`apps/wiki`)

Dettagli **specifici** della demo wiki. Per struttura monorepo, **sicurezza condivisa** (`@donq/security`),
comandi e deploy vedi il **[CLAUDE.md di root](../../CLAUDE.md)** — questo file lo integra, non lo ripete.

## 1. Cos'è
Chat documentale su una PMI manifatturiera inventata ("Officine Meccaniche Aurora S.r.l."): l'utente fa
domande, ottiene risposte **con le fonti citate** e naviga le **pagine collegate** anche tramite un
**knowledge graph** interattivo. UI allineata al brand donq.io (font Unbounded/Sora, palette monocromatica
+ accenti pastello). Stack app: Next.js 15 + Tailwind v4 + Framer Motion; LLM via OpenRouter a runtime.

## 2. Architettura: LLM Wiki (metodologia Karpathy) — NON è un RAG classico
Tre livelli:
1. `content/raw/` — sorgenti immutabili (documenti aziendali grezzi). Verità di base, sola lettura.
2. `content/wiki/` — pagine markdown **interconnesse, scritte dall'agente** (vedi §5): `sources/`,
   `concepts/`, `entities/` + `index.md`, `log.md`. Collegate con wikilink `[[id|testo]]`.
3. `content/WIKI_SCHEMA.md` — le convenzioni (il "CLAUDE.md" della metodologia originale).

Pipeline:
- **Ingest** = l'**agente** legge `raw/` e scrive `wiki/` seguendo lo schema. **NON c'è una pipeline a
  chiamate LLM/API per costruire il wiki** (vedi §6, lezione appresa).
- **Derivazione grafo** = `scripts/wiki-graph.ts` legge `content/wiki/**` e genera `content/graph.json`
  (nodi = pagine, archi = `[[link]]`). Gira **in automatico** in `predev`/`prebuild`. Nessun LLM.
- **Query (runtime)** = `lib/retrieval.ts` seleziona le pagine d'ingresso (BM25) + espande sui
  collegamenti del grafo; `lib/wiki-answer.ts` chiede all'LLM una risposta che **cita le pagine**.

## 3. Provider LLM: OpenRouter (solo a runtime)
- Client: `lib/llm.ts` (SDK `openai` puntato a `https://openrouter.ai/api/v1`).
- Modello default: **`google/gemini-2.5-flash`** (env `OPENROUTER_MODEL`).
- Usato **solo** per rispondere in chat (`/api/chat`). La costruzione del wiki non usa l'API.
- ⚠️ Header HTTP solo ASCII (vedi lezione comune in CLAUDE.md root): `X-Title`/`HTTP-Referer` in ASCII.
- Env specifiche wiki: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `LLM_MAX_TOKENS`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_CONTACT_URL`, `MAX_QUESTION_LEN` (vedi `lib/env.ts` e `.env.example`).

## 4. Flusso di una domanda (`app/api/chat/route.ts`)
Cascata: sessione firmata valida → input valido (lunghezza) → heartbeat sessione + limite concorrenza →
**rate limit per IP** → **budget globale giornaliero** → config (chiave OpenRouter) → retrieval →
**streaming** (NDJSON). (Le difese vengono da `@donq/security`.)
Protocollo NDJSON: eventi `{type:"meta"|"token"|"citations"|"done"|"error"}`. La risposta dell'LLM è
testo + marcatore `<<<CITAZIONI>>>` + array JSON di citazioni; il server splitta e arricchisce le
citazioni (valida `pageId`, calcola le pagine collegate dal grafo). Il cookie sessione è rinnovato a
ogni risposta (sessione scorrevole).

## 5. Convenzioni del wiki (per costruire/estendere le pagine)
- Ogni pagina in `content/wiki/{sources|concepts|entities}/<id>.md`. `id` = nome file (kebab-case).
- Frontmatter: `id, type, title, category, tags, summary` (category tra: Azienda, Prodotti, Qualità,
  Sicurezza, HR, Operations, Commerciale).
- **Collegare SEMPRE con `[[id-esatto|testo]]`** dove `id` = nome file di una pagina esistente.
  `wiki-graph.ts` risolve anche per *slug* di id/titolo, ma l'id esatto è la via sicura.
- `index.md`, `log.md`, `SCHEMA.md`, `overview.md` a livello radice **NON** sono nodi del grafo.
- Se manca `category` → il grafo colora **per tipo**; se manca `summary` → derivato dal 1° paragrafo.

## 6. Lezione appresa specifica
**Il wiki lo costruisce l'agente, non una pipeline a pagamento.** In passato esisteva uno
`scripts/wiki-build.ts` che chiamava OpenRouter per generare le pagine → spreco di crediti. Rimosso.
Le pagine si scrivono seguendo `WIKI_SCHEMA.md`; l'API serve solo a rispondere a runtime.

## 7. Note UI
- `GraphView`: grafo denso → forze tarate (repulsione forte, archi lunghi/morbidi) + **auto-fit**
  (centra/scala quando la simulazione si assesta; bottone "adatta"). Etichette solo all'hover.
- `DocViewer`: scroll **confinato al contenitore** (mai `scrollIntoView`) — evita il bug "pagina
  tagliata in alto". Highlight animato della porzione citata.
- `components/Markdown.tsx`: wikilink `[[...]]` → `wiki:` + `urlTransform` anti-XSS (vedi lezione comune).
- Branding/colori in `app/globals.css` (`@theme`).

## 8. Mappa file (app wiki)
```
app/            page (landing), wiki/page, api/session, api/chat
components/      WikiApp (orchestratore), ChatPanel, DocViewer, GraphView, Markdown, LimitModal
lib/            env (app), llm (OpenRouter), retrieval, wiki-answer, citations, graph, slug, types
content/raw/    sorgenti immutabili
content/wiki/   pagine generate dall'agente (artefatto committato) + WIKI_SCHEMA.md
scripts/        wiki-graph (deriva graph.json), wiki-lint, load-env (per gli script tsx)
```
Comandi specifici: `pnpm --filter @donq/wiki wiki:graph` (rigenera graph.json), `... wiki:lint` (health check).
