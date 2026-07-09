# Changelog / Log delle decisioni — demo-ai

> Append-only. Ogni voce registra COSA è stato fatto e PERCHÉ.
> Inizializzato il 2026-06-30. Storia pregressa non tracciata (vedi nota in fondo).

<!-- Le nuove voci vanno qui, in cima, nel formato:

## 2026-06-30 — [ticket] — [titolo]
- Cosa: [sintesi della modifica]
- Perché: [motivazione, scelta deliberata]
- Impatti: [aree toccate, eventuali scelte che questa modifica vincola]
-->

## 2026-07-07 — Productive #262 — Evoluzione Wiki: multi use-case selezionabili (Fase B — contenuti Meridian)
- Cosa: completati i contenuti di "Meridian Studio Associato", passato da 8 a **26 nodi di grafo**
  (6 `wiki/sources/`, 12 `wiki/concepts/`, 8 `wiki/entities/`, più le 6 fonti immutabili in `raw/`) —
  a parità di profondità con Aurora (32) e Borealis (28). Aggiornati i wikilink incrociati nelle
  pagine esistenti e in `index.md`/`overview.md`/`log.md`. Verificato con `wiki:graph` + `wiki:lint`:
  0 pagine orfane, 0 link non risolti, 0 summary mancanti. Solo contenuto: nessuna modifica a
  `lib/usecases.ts`, `lib/graph.ts`, route o API — l'impianto era già cablato per `meridian` dalla
  Fase A (commit 3868c36).
- Perché: chiude il seed lasciato aperto in Fase A ("Meridian ... seed 8 pagine, full in Fase B"),
  portando il contratto B6 della spec #262 a essere pienamente soddisfatto per tutte e 3 le aziende
  (non solo Aurora e Borealis).
- Impatti: nessun impatto architetturale. `apps/wiki/ARCHITECTURE.md` non è stato toccato: descrive
  già correttamente lo stato attuale (mappa `{aurora, borealis, meridian}`, pipeline per-slug), e
  non enumera conteggi di pagine per azienda che andrebbero disallineati da questa modifica.

## 2026-06-30 — Productive #262 — Evoluzione Wiki: multi use-case selezionabili (Fase A)
- Cosa: la demo Wiki passa da singola azienda ("Aurora") a piattaforma multi use-case. Landing =
  galleria; `/wiki/<slug>` = wiki per azienda con nome/palette/documenti propri. Registry unico
  `lib/usecases.ts` (aurora, borealis, meridian). Contenuti, grafo, retrieval (BM25), citazioni e
  `X-Title`/system-prompt ora **per-slug**; `/api/chat` riceve e valida `usecaseSlug`. Aurora migrata in
  `content/aurora/`; nuove aziende Borealis Costruzioni S.p.A. (Edilizia, 28 pagine) e Meridian Studio
  Associato (Servizi, seed 8 pagine, full in Fase B), contenuti scritti dall'agente (no pipeline LLM).
- Perché: CR del cliente — riusare per N aziende ciò che si faceva solo per Aurora. Approccio
  incrementale (GATE 2): impianto + 1 azienda nuova full + 1 seed, poi espansione.
- Impatti: ABBANDONATA l'invariante "un solo `content/graph.json` importato staticamente" → ora N
  graph.json per-slug (mappa di import statici in `lib/graph.ts`: aggiungere un'azienda tocca quel file).
  Route `/wiki` ora redirige alla galleria. `APP_NAMESPACE` resta `wiki`: segregazione sui CONTENUTI,
  NON sui limiti di sicurezza (rate-limit/budget condivisi tra aziende). Aggiunto `pretest` (rigenera i
  grafi prima di vitest). Test-first: contratto B1–B8 in `tests/unit` + `e2e` (commit fe3ee6e, pre-codice).
  Doc: aggiornato `apps/wiki/ARCHITECTURE.md` (§1, §2, §7, §8).

---
Nota: questo changelog traccia le decisioni a partire dalla sua data di inizializzazione (2026-06-30).
Nessun tag/release git preesistente da importare (il repo non ha tag al momento dell'inizializzazione).
La storia precedente vive in git.
