# Piano di implementazione — Revisione documenti knowledge base (Productive #151)
spec: .ai-dev/specs/151-revisione-documenti-knowledge-base.md · stato: proposto

## Approccio

Tre blocchi, in quest'ordine (il primo abilita i test degli altri due).

**1. Mappa degli ambiti nel registry** — `lib/usecases.ts` guadagna un campo dati per use-case:

    scope: { covered: string[]; notCovered: string[] }

Le voci sono quelle dell'allegato per il verticale dell'azienda: `covered` = voci con `X`,
`notCovered` = voci senza `X`. Nessun nuovo file, nessun nuovo modulo: e' l'unica fonte di verita'
richiesta da B5, e alimenta sia la vetrina (B11) sia i test (B2/B4).

**2. Vetrina in homepage (B11)** — l'empty state di `ChatPanel` (dove gia' vivono le `suggestions`)
mostra due gruppi: "Cosa trovi qui" (`covered`) e "Cosa coprirebbe una versione su misura"
(`notCovered`). Il campo `scope` viaggia sulla prop `usecase` gia' esistente
(page.tsx → WikiApp → ChatPanel). Presentazione coerente con le chip attuali, nessuna libreria nuova.

**3. Contenuti, azienda per azienda** — per ogni voce `X` scoperta: 1 documento in
`content/<slug>/raw/` + 1 pagina `wiki/sources/<id>.md` (nodo del grafo). Per ogni voce senza `X`
oggi coperta da un documento: si elimina il documento `raw/` e la sua pagina `sources/`, e il
contenuto che vale si trasferisce come **menzione** dentro i `concepts/` o le `entities/` pertinenti.
Entita' e concetti-hub (sedi, professionisti, commesse, pratiche, processi) restano: non sono
tipologie documentali (perimetro di B4). A ogni azienda: `index.md`, `overview.md`, `log.md` e i
wikilink incrociati aggiornati, poi `wiki:graph` + `wiki:lint` a zero orfani / zero link rotti.

Ordine di lavoro: Aurora (4 nuove voci, 6 declassamenti) → Borealis (2 nuove, 4 declassamenti)
→ Meridian (2 nuove, 6 declassamenti). Snapshot "before" catturato prima di toccare i contenuti.

## File toccati

| File / area | Cosa |
|---|---|
| `apps/wiki/lib/usecases.ts` | campo `scope` per i 3 use-case; revisione `suggestions` (Aurora: via ferie/DPI) e `tagline` dove non rispecchiano piu' i documenti |
| `apps/wiki/app/wiki/[usecase]/page.tsx` | passa `scope` a `WikiApp` |
| `apps/wiki/components/WikiApp.tsx` | tipo `usecase` + inoltro a `ChatPanel` |
| `apps/wiki/components/ChatPanel.tsx` | vetrina dei due gruppi nell'empty state |
| `apps/wiki/content/aurora/**` | +4 raw/sources (schede tecniche, manuali montaggio-uso-manutenzione, listini e cataloghi, preventivi); -6 raw/sources attuali → menzioni |
| `apps/wiki/content/borealis/**` | +2 raw/sources (qualifiche subappaltatori/DURC, elaborati grafici/BIM); -4 raw/sources (PSC-POS, computo metrico, giornale lavori, contratto subappalto) → menzioni |
| `apps/wiki/content/meridian/**` | +2 raw/sources (storico pratiche e casi, checklist operative e di compliance); -6 raw/sources attuali → menzioni |
| `apps/wiki/tests/unit/**`, `apps/wiki/e2e/**` | scritti dal sub-agent test-author dalla sola spec, prima del codice |

Non toccati: `packages/security/**`, `apps/finance/**`, `lib/graph.ts` (il set di aziende non cambia),
`lib/retrieval.ts`, `scripts/wiki-graph.ts`, `/api/chat`.

## Rischi

1. **Diff grande sui contenuti** (~16 documenti declassati, 8 nuovi): il rischio concreto e' lasciare
   pagine orfane o wikilink rotti. Guardia: `wiki:lint` per azienda dopo ogni blocco, non solo alla fine.
2. **Meridian si assottiglia**: perde tutti e 6 i documenti sorgente attuali e ne guadagna 2. I nodi
   restano grazie a entita' e concetti, ma B8 (nessuna azienda sotto il 70% dei nodi della piu' ricca)
   va verificato a fine lavoro, non dato per scontato.
3. **Perdita di contenuto utile**: procedure, PSC/POS, giornale lavori sono ben scritti. Mitigazione:
   declassare = trasferire la sostanza dentro i concepts, non cancellare e basta.
4. **Suggestions orfane**: le domande di esempio devono avere risposta nei documenti che restano (B9).
5. **non-regression senza comando** (playbook: `<DA_DEFINIRE>`): si compensa con snapshot "before"
   (graph.json + output `wiki:lint` + conteggio nodi/archi per azienda) e confronto post.
6. La vetrina B11 e' l'unico punto che tocca la UI: rischio basso, ma va vista in dev prima del Gate 3.

## Test previsti (derivati dalla spec — li scrive il sub-agent isolato)

- **B1/B9** registry: 3 aziende, verticali coerenti, slug unici, `xTitle` ASCII, suggestions con
  risposta nei contenuti.
- **B2/B5** per ogni voce `covered`: esiste un documento in `raw/` e una pagina nel grafo dedicata.
- **B4** per ogni voce `notCovered`: nessun documento `raw/` e nessun nodo dedicato.
- **B3** retrieval: una query che nomina una voce `covered` seleziona la pagina dedicata di
  quell'azienda ed e' citabile.
- **B6** segregazione per-slug: nessun link/citazione cross-azienda.
- **B7/B8** salute del grafo (0 orfani, 0 link non risolti, 0 summary mancanti) e profondita' >=70%.
- **B11** e2e: aprendo `/wiki/<slug>` compaiono i due gruppi e ogni voce dell'elenco sta in uno solo.
