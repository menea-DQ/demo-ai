# Piano di implementazione — Wiki multi use-case (Productive #262)
spec: .ai-dev/specs/262-evoluzione-wiki-multi-usecase.md · stato: approvato (incrementale)

## Sequenza (deciso al GATE 2: incrementale)
- **Fase A** — impianto multi use-case end-to-end con **2 aziende**: Aurora (migrata a slug) +
  **Borealis** (nuova, ~30 pagine). Si validano qui tutti i comportamenti B1–B8 e si esegue la suite.
- **Fase B** — aggiunta **Meridian**: una riga nel registry + `content/meridian/**` + rigenerazione
  grafo. Nessun cambio d'impianto (è la prova che "aggiungere un'azienda = registry + cartella").
- I test sono scritti **agnostici al numero**: asseriscono sul registry (tutte le aziende presenti,
  qualunque slug ignoto → 404, segregazione tra due slug qualsiasi), non su un conteggio fisso.

## Approccio
**Registry** unico + **contenuti/grafo/indice per-slug** + **route `/wiki/[usecase]`** + **palette via CSS vars**.
Riuso al massimo il codice esistente: BM25, grafo, streaming, sicurezza restano; vengono solo
**parametrizzati per slug**. Nessun nuovo pacchetto, nessun motore di temi, nessun DB.

1. **Registry** (`lib/usecases.ts`, nuovo): array di `{ slug, companyName, vertical, tagline,
   assistantName, xTitle (ASCII), colors:{ rose/blue/cyan o equivalenti accent } }`. Unica fonte (B5).
   Aurora + Borealis + Meridian. `getUsecase(slug)` / `listUsecases()`.
2. **Contenuti per-azienda**: migro `content/wiki|raw` → `content/aurora/...`; creo
   `content/borealis/...` e `content/meridian/...` (~30 pagine ciascuna, scritte da me come agente
   secondo `WIKI_SCHEMA.md`, derivate dagli elenchi del file MD). Nessuna pipeline LLM (lezione §6).
3. **Grafo per-slug** (`scripts/wiki-graph.ts`): scansiona `content/<slug>/wiki/**` per ogni slug del
   registry → scrive `content/<slug>/graph.json`. `lib/graph.ts`: mappa statica di import dei graph.json
   per slug → `getGraph(slug)`, adiacenze e lookup per-slug (no più singleton globale).
4. **Retrieval per-slug** (`lib/retrieval.ts`): l'indice BM25 (oggi singleton di modulo) diventa
   **memoizzato per slug** (`Map<slug, Index>`, build lazy al primo uso). Firma `retrieve(slug, q, ...)`.
5. **Risposta per-slug** (`lib/wiki-answer.ts`): SYSTEM_PROMPT costruito da nome azienda/assistente
   del registry; `streamAnswer(usecase, q, pages)`. `lib/llm.ts`: `X-Title` ASCII dal registry.
   `lib/citations.ts`: enrich/related usano il grafo dello slug.
6. **API** (`app/api/chat/route.ts`): legge `usecaseSlug` dal body, **valida** contro il registry
   (slug ignoto → errore controllato, nessuna chiamata LLM, B8), poi `retrieve(slug,...)` +
   `streamAnswer(usecase,...)`.
7. **Route & UI**:
   - `app/page.tsx` → **galleria** delle aziende del registry (card con nome/verticale/colore, link
     a `/wiki/<slug>`) (B1).
   - `app/wiki/page.tsx` → diventa `app/wiki/[usecase]/page.tsx`; slug valido carica quell'azienda,
     slug ignoto → `notFound()` (404, B2). Aggiungo redirect `/wiki` → `/` (galleria).
   - `components/WikiApp.tsx`, `components/ChatPanel.tsx`: ricevono props use-case (nome, assistente,
     colori, slug), rimuovono i letterali "Aurora", inviano `usecaseSlug` nelle richieste chat.
   - **Palette**: token base in `globals.css` invariati; ogni `/wiki/<slug>` applica gli accent della
     sua azienda come **CSS custom properties** su un wrapper (override di `--color-accent-*`, già usati
     da grafo/highlight). Nessuna modifica a `@theme`.
   - `app/layout.tsx`: metadata generico; titolo per-azienda via metadata di pagina.

## File toccati
- **Nuovi**: `lib/usecases.ts`; `app/wiki/[usecase]/page.tsx`; `content/borealis/**`,
  `content/meridian/**` (contenuti); test (li scrive il sub-agent isolato).
- **Modificati**: `lib/graph.ts`, `lib/retrieval.ts`, `lib/wiki-answer.ts`, `lib/llm.ts`,
  `lib/citations.ts`, `app/api/chat/route.ts`, `app/page.tsx`, `app/layout.tsx`,
  `components/WikiApp.tsx`, `components/ChatPanel.tsx`, `scripts/wiki-graph.ts`,
  `scripts/wiki-lint.ts` (per-slug), `app/globals.css` (solo se servono var base aggiuntive).
- **Spostati**: `content/wiki/**`→`content/aurora/wiki/**`, `content/raw/**`→`content/aurora/raw/**`.
- **Rimosso**: `app/wiki/page.tsx` (sostituito dalla route dinamica + redirect).

## Rischi
- **Indice BM25 singleton → per-slug**: se ricostruito a ogni richiesta è un regressione di perf.
  Mitigo con memoizzazione per slug (build una volta per slug, poi cache). Da verificare.
- **Import statici di N graph.json**: serve una mappa statica `{slug: graph}` (Next non importa per
  path dinamico). OK per N fisso e piccolo; aggiungere un'azienda = una riga nel registry + cartella.
- **graph.json deve esistere al build**: i contenuti nuovi vanno creati prima; `predev`/`prebuild`
  rilanciano `wiki:graph` per tutti gli slug. Il grosso del lavoro è generare ~60 pagine.
- **Palette via CSS vars**: i componenti devono leggere `var(--color-accent-*)` (già così); verificare
  che non restino colori accent hardcoded fuori dalle var.
- **Header ASCII**: `xTitle` nel registry già ASCII; sanificazione di sicurezza comunque applicata.
- **Volume contenuti**: ~30 pagine × 2 aziende; rischio di grafi "degeneri" se poco collegate →
  rispettare i wikilink dello schema (B6 richiede grafo non degenere).

## Test previsti (derivati dalla spec — li scrive il sub-agent isolato)
- **B1**: la galleria elenca tutte le aziende del registry, ciascuna con link a `/wiki/<slug>`.
- **B2**: `/wiki/<slug valido>` rende quell'azienda; slug ignoto → 404; `/wiki` → redirect a `/`.
- **B3** (invariante): `retrieve(slugX, …)` non restituisce mai pagine appartenenti a un altro slug;
  le citazioni di X non risolvono pagine di Y.
- **B4**: due use-case espongono token palette **distinti** sul wrapper.
- **B5**: per uno use-case ≠ aurora, l'output parametrizzato non contiene il letterale "Aurora";
  nome/assistente provengono dal registry.
- **B7**: `wiki:graph` produce un `graph.json` per ciascuna cartella azienda; `getGraph(slug)` carica
  il grafo giusto.
- **B8**: `/api/chat` con slug ignoto → errore controllato senza chiamata LLM; con slug valido usa i
  contenuti di quell'azienda.
