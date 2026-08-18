# Changelog / Log delle decisioni — demo-ai

> Append-only. Ogni voce registra COSA è stato fatto e PERCHÉ.
> Inizializzato il 2026-06-30. Storia pregressa non tracciata (vedi nota in fondo).

<!-- Le nuove voci vanno qui, in cima, nel formato:

## 2026-06-30 — [ticket] — [titolo]
- Cosa: [sintesi della modifica]
- Perché: [motivazione, scelta deliberata]
- Impatti: [aree toccate, eventuali scelte che questa modifica vincola]
-->

## 2026-08-18 — Productive #151 — Revisione documenti knowledge base: ambiti consultabili vs solo menzionati per verticale
- Cosa: ribilanciati i contenuti delle 3 aziende sull'allegato del ticket (elenco tipologie
  documentali per verticale, con marcatura `X`). Restano documento sorgente (`raw/`) + pagina
  consultabile (`wiki/sources/`) **solo** le voci marcate `X`; le altre restano solo come menzione
  dentro `concepts/`/`entities/` esistenti. Aurora 6→4 documenti sorgente (schede tecniche, manuali
  montaggio/uso/manutenzione, listini e cataloghi, preventivi), Borealis 6→4 (capitolato, qualifica
  subappaltatori+DURC, elaborati grafici/BIM, schede tecniche/DoP), Meridian 6→2 (storico pratiche e
  casi, checklist operative e di compliance). Nodi del grafo per azienda: 32/28/26 → 30/26/22, con
  0 pagine orfane e 0 link non risolti su tutte e tre (verificato `wiki:graph`+`wiki:lint`). Sei
  pagine ri-titolate perché il titolo coincideva con una tipologia ora non consultabile: Borealis
  `ddt-bolle`, `varianti-progetto`, `giornale-lavori`; Meridian `linee-guida-categoria`,
  `corrispondenza-enti-clienti`, `know-how-senior` — i wikilink verso le pagine `sources/` rimosse
  sono sostituiti da menzioni testuali semplici. Nuovo campo `topics: Topic[]` su ogni azienda in
  `lib/usecases.ts`: mappa esplicita voce-allegato → `{covered, raw?, pages?, kind?}`, unica fonte di
  verità sia per la nuova vetrina in homepage sia per i test. `ChatPanel` (empty state) mostra la
  vetrina in due gruppi (`data-testid="ambiti-trattati"` / `"ambiti-non-coperti"`), prop inoltrata da
  `WikiApp`/`app/wiki/[usecase]/page.tsx`; autoscroll disattivato a chat vuota per non nasconderla.
  `suggestions` del registry riviste per puntare solo a contenuti ora consultabili. Versionato
  `.ai-dev/attachments/productive-19362740/**` (eccezione in `.gitignore`): l'allegato è l'oracolo
  letto dalla suite di test. Aggiornato `apps/wiki/ARCHITECTURE.md` (drift rilevato in Fase 1,
  sanato qui): path `content/<slug>/wiki/...` in §5 (era pre-multi-use-case), rimosso il contratto di
  frontmatter unico mai stato vero per nessuna delle tre aziende, sostituito con la distinzione reale
  per-azienda (SCHEMA.md di ciascuna), tolto il riferimento a `WIKI_SCHEMA.md` (§6, file inesistente),
  esplicitato che `raw/` non è mai letto a runtime e che è proprio questo fatto — raw/ + nodo del
  grafo in `wiki/sources/` — a definire "consultabile" (§5); documentata la vetrina in §7.
- Perché: il criterio consultabile/menzionata **non esisteva** in #262 — l'elenco delle tipologie
  documentali era lo stesso, ma senza le marcature `X` (l'allegato di allora era una versione
  precedente, senza le X). Con le marcature esplicite, al Gate 1 l'utente ha scelto il
  **ribilanciamento** (rendere consultabili le voci `X` e degradare a menzione quelle senza,
  eliminandone i documenti pieni) invece dell'opzione additiva (aggiungere gli 8-9 documenti mancanti
  senza toccare gli esistenti) — per rendere il criterio dimostrabile in demo senza un secondo set di
  documenti "sovrapposti" a quelli già scritti, e per far coincidere esattamente cosa la wiki può
  aprire/citare con cosa il verticale considera prioritario secondo l'allegato.
- Impatti: questa scelta **disfa in parte, consapevolmente, il lavoro di #262 Fase A/B**: 16 dei 18
  documenti sorgente (6 per azienda) cambiano ruolo, passando da documento pieno a semplice menzione;
  i conteggi nodi 32/28/26 raggiunti in #262 Fase B come "profondità comparabile" scendono a
  30/26/22 — restano comparabili (nessuna azienda sotto il 70% della più ricca) ma la baseline di
  riferimento per confronti futuri è questa, non più quella di Fase B. La mappa `topics` in
  `lib/usecases.ts` diventa il punto da aggiornare se l'elenco delle tipologie documentali del
  verticale cambia (nuovo allegato, nuove marcature `X`): è la fonte sia della vetrina B11 sia dei
  test di copertura B2-B4. Nessun impatto su `@donq/security`, `apps/finance`, `lib/graph.ts` (nessuna
  azienda aggiunta o rimossa, solo contenuto + registry).

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
