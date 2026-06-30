# ARCHITECTURE.md — Aurora Wiki (`apps/wiki`)

Dettagli **specifici** della demo wiki. Per struttura monorepo, **sicurezza condivisa** (`@donq/security`),
comandi e deploy vedi il **[CLAUDE.md di root](../../CLAUDE.md)** — questo file lo integra, non lo ripete.

## 1. Cos'è
Chat documentale **multi use-case**: la landing è una **galleria di aziende** (una per verticale);
scelta un'azienda si entra in `/wiki/<slug>`, una wiki a sé con **nome, palette e documenti propri**.
L'utente fa domande, ottiene risposte **con le fonti citate** e naviga le **pagine collegate** anche
tramite un **knowledge graph** interattivo. Le aziende sono descritte nel **registry** `lib/usecases.ts`
(unica fonte di nome/verticale/palette/assistente). UI allineata al brand donq.io (font Unbounded/Sora,
palette monocromatica + accenti pastello sovrascritti per azienda). Stack: Next.js 15 + Tailwind v4 +
Framer Motion; LLM via OpenRouter a runtime.

**Segregazione per azienda**: contenuti, retrieval, grafo e citazioni sono **per-slug** — una domanda
nella wiki X attinge solo ai documenti di X. La sicurezza condivisa (`@donq/security`) NON è segregata
per azienda: `APP_NAMESPACE` resta `wiki`, quindi rate-limit e budget sono condivisi tra gli use-case.

## 2. Architettura: LLM Wiki (metodologia Karpathy) — NON è un RAG classico
Tre livelli, **per azienda** (`content/<slug>/...`):
1. `content/<slug>/raw/` — sorgenti immutabili (documenti aziendali grezzi). Verità di base, sola lettura.
2. `content/<slug>/wiki/` — pagine markdown **interconnesse, scritte dall'agente** (vedi §5): `sources/`,
   `concepts/`, `entities/` + `index.md`, `log.md`. Collegate con wikilink `[[id|testo]]`.
3. `content/<slug>/wiki/SCHEMA.md` — le convenzioni (il "CLAUDE.md" della metodologia originale).

Pipeline:
- **Ingest** = l'**agente** legge `raw/` e scrive `wiki/` seguendo lo schema. **NON c'è una pipeline a
  chiamate LLM/API per costruire il wiki** (vedi §6, lezione appresa).
- **Derivazione grafo** = `scripts/wiki-graph.ts` scopre le aziende (sottocartelle di `content/` con un
  `wiki/`) e genera **un `content/<slug>/graph.json` per ciascuna** (nodi = pagine, archi = `[[link]]`).
  Gira **in automatico** in `predev`/`prebuild`/`pretest`. Nessun LLM. Frontmatter YAML malformato non
  blocca la build (warn + fallback). I `graph.json` sono artefatti gitignored, rigenerati al bisogno.
- **Caricamento runtime** = `lib/graph.ts` importa staticamente i `graph.json` per slug (mappa
  `{aurora, borealis, meridian}`) e memoizza lookup/adiacenze per slug. `lib/usecases.ts` è il registry.
- **Query (runtime)** = `lib/retrieval.ts` costruisce un indice BM25 **per slug** (memoizzato), seleziona
  le pagine d'ingresso + espande sui collegamenti del grafo di quell'azienda; `lib/wiki-answer.ts` chiede
  all'LLM una risposta che **cita le pagine** (system prompt e `X-Title` parametrizzati per azienda).
  `/api/chat` riceve `usecaseSlug`, lo **valida** contro il registry (slug ignoto → niente LLM).

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
- Branding/colori base in `app/globals.css` (`@theme`); gli **accent per azienda** sono sovrascritti
  per-route: `app/wiki/[usecase]/page.tsx` applica `--color-accent-{rose|blue|cyan}` (dal registry) come
  CSS custom properties su un wrapper, che cascano su tutti i componenti che leggono quelle variabili.

## 8. Mappa file (app wiki)
```
app/            page (galleria), wiki/page (redirect → /), wiki/[usecase]/page (wiki per azienda),
                api/session, api/chat
components/      WikiApp (orchestratore, prop `usecase`), ChatPanel, DocViewer, GraphView, Markdown, LimitModal
lib/            usecases (REGISTRY aziende), env (app), llm (OpenRouter), retrieval (BM25 per slug),
                wiki-answer (prompt+X-Title per azienda), citations (per slug), graph (per slug), slug, types
content/<slug>/raw/     sorgenti immutabili dell'azienda
content/<slug>/wiki/    pagine generate dall'agente + SCHEMA.md (una cartella per azienda)
content/<slug>/graph.json   artefatto derivato (gitignored), uno per azienda
scripts/        wiki-graph (deriva i graph.json per azienda), wiki-lint (per azienda), load-env
```
Aggiungere un'azienda = voce in `lib/usecases.ts` + cartella `content/<slug>/` + import in `lib/graph.ts`.
Comandi: `pnpm --filter @donq/wiki wiki:graph` (rigenera i graph.json), `... wiki:lint` (health check),
`... test` (vitest unit, rigenera i grafi via `pretest`).
