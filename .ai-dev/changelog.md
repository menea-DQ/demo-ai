# Changelog / Log delle decisioni — demo-ai

> Append-only. Ogni voce registra COSA è stato fatto e PERCHÉ.
> Inizializzato il 2026-06-30. Storia pregressa non tracciata (vedi nota in fondo).

<!-- Le nuove voci vanno qui, in cima, nel formato:

## 2026-06-30 — [ticket] — [titolo]
- Cosa: [sintesi della modifica]
- Perché: [motivazione, scelta deliberata]
- Impatti: [aree toccate, eventuali scelte che questa modifica vincola]
-->

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
