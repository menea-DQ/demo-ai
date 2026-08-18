# ARCHITECTURE.md — Aurora Wiki (`apps/wiki`)

Dettagli **specifici** della demo wiki. Per struttura monorepo, **sicurezza condivisa** (`@donq/security`),
comandi e deploy vedi il **[CLAUDE.md di root](../../CLAUDE.md)** — questo file lo integra, non lo ripete.

## 1. Cos'è
Chat documentale **multi use-case**: la landing è una **galleria di aziende** (una per verticale);
scelta un'azienda si entra in `/wiki/<slug>`, una wiki a sé con **nome, palette e documenti propri**.
L'utente fa domande, ottiene risposte **con le fonti citate** e naviga le **pagine collegate** anche
tramite un **knowledge graph** interattivo. Le aziende sono descritte nel **registry** `lib/usecases.ts`
(unica fonte di nome/verticale/palette/assistente/ambiti documentali). Prima ancora di fare una
domanda, la homepage di ogni azienda mostra una **vetrina degli ambiti**: quali tipologie documentali
sono consultabili (citabili in chat) e quali sono solo nominabili (§5, §7). UI allineata al brand
donq.io (font Unbounded/Sora,
palette monocromatica + accenti pastello sovrascritti per azienda). Stack: Next.js 15 + Tailwind v4 +
Framer Motion; LLM via OpenRouter a runtime.

**Segregazione per azienda**: contenuti, retrieval, grafo e citazioni sono **per-slug** — una domanda
nella wiki X attinge solo ai documenti di X. La sicurezza condivisa (`@donq/security`) NON è segregata
per azienda: `APP_NAMESPACE` resta `wiki`, quindi rate-limit e budget sono condivisi tra gli use-case.

## 2. Architettura: LLM Wiki (metodologia Karpathy) — NON è un RAG classico
Tre livelli, **per azienda** (`content/<slug>/...`):
1. `content/<slug>/raw/` — sorgenti immutabili (documenti aziendali grezzi). Verità di base, sola
   lettura, letta **solo dall'agente** in fase di ingest: **nessun modulo di runtime la legge** (zero
   riferimenti in `lib/`, `app/`, `components/`) — non è un canale di consultazione per l'utente finale.
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
- Ogni pagina in `content/<slug>/wiki/{sources|concepts|entities}/<id>.md`. `id` = nome file (kebab-case).
- Il frontmatter è **per-azienda**, definito nel `content/<slug>/wiki/SCHEMA.md` di quell'azienda — non
  esiste un contratto unico tra le tre: Aurora usa `title, type, tags, sources, updated` (niente
  `category`/`id`/`summary`; `sources:` elenca i file di `raw/` che alimentano la pagina); Borealis usa
  `title, type, category, tags, summary, updated` con `category` tra Azienda/Commessa/Sicurezza/
  Qualità/Compliance/Operations/Commerciale/HR; Meridian stessa forma ma `category` tra Azienda/
  Pratica/Compliance/Normativa/Operations/Commerciale. Leggere sempre lo SCHEMA.md dell'azienda prima
  di scrivere o modificare una pagina.
- **Collegare SEMPRE con `[[id-esatto|testo]]`** dove `id` = nome file di una pagina esistente.
  `wiki-graph.ts` risolve anche per *slug* di id/titolo, ma l'id esatto è la via sicura.
- `index.md`, `log.md`, `SCHEMA.md`, `overview.md` a livello radice **NON** sono nodi del grafo
  (`SKIP_FILES` in `scripts/wiki-graph.ts`).
- Se manca `category` → il grafo colora **per tipo**; se manca `summary` → derivato dal 1° paragrafo.

**Documentazione "consultabile" vs "solo menzionata"** — distinzione esplicita per verticale nella
mappa `topics` di `lib/usecases.ts` (una voce per tipologia documentale dell'azienda):
- **consultabile** (`covered: true`) solo se esistono **entrambi**: un documento dedicato in `raw/` e
  una pagina di sintesi in `wiki/sources/<id>.md` (quindi un nodo del grafo, raggiungibile dal
  retrieval e citabile). Fa eccezione la voce di tipo `kind: "capability"` (non è un documento ma una
  funzionalità della demo: nessun `raw/` richiesto).
- **solo menzionata** (`covered: false`) se manca l'uno o l'altro: nessun documento dedicato in `raw/`
  e nessun nodo del grafo dedicato; il tema può comparire come frase dentro pagine esistenti, ma non è
  apribile né citabile come documento a sé.
- La homepage per azienda mostra questa mappa come vetrina, prima ancora della prima domanda (§7).

## 6. Lezione appresa specifica
**Il wiki lo costruisce l'agente, non una pipeline a pagamento.** In passato esisteva uno
`scripts/wiki-build.ts` che chiamava OpenRouter per generare le pagine → spreco di crediti. Rimosso.
Le pagine si scrivono seguendo il `SCHEMA.md` di ciascuna azienda (`content/<slug>/wiki/SCHEMA.md`);
l'API serve solo a rispondere a runtime.

## 7. Note UI
- `ChatPanel` (empty state): vetrina degli **ambiti documentali**, letta da `usecase.topics`
  (`lib/usecases.ts`, §5) e passata da `WikiApp`/`app/wiki/[usecase]/page.tsx`. Due gruppi distinti:
  ambiti trattati (`data-testid="ambiti-trattati"`, voci consultabili) e ambiti non coperti in questo
  POC (`data-testid="ambiti-non-coperti"`, voci solo menzionate). L'autoscroll è disattivato quando la
  chat è vuota, altrimenti nasconderebbe la vetrina sotto il saluto.
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
content/<slug>/raw/     sorgenti immutabili dell'azienda (non lette a runtime, solo dall'agente)
content/<slug>/wiki/    pagine generate dall'agente + SCHEMA.md (una cartella per azienda)
content/<slug>/graph.json   artefatto derivato (gitignored), uno per azienda
scripts/        wiki-graph (deriva i graph.json per azienda), wiki-lint (per azienda), load-env
```
Aggiungere un'azienda = voce in `lib/usecases.ts` + cartella `content/<slug>/` + import in `lib/graph.ts`.
Comandi: `pnpm --filter @donq/wiki wiki:graph` (rigenera i graph.json), `... wiki:lint` (health check),
`... test` (vitest unit, rigenera i grafi via `pretest`).
