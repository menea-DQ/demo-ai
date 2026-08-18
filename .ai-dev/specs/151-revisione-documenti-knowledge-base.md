# Specifica — Revisione documenti progetto knowledge base
ticket: Productive #151 (19362740) · tipo: CR · data: 2026-08-18 · stato: approvata (Gate 1, 2026-08-18)

## Obiettivo
Allineare i contenuti documentali delle 3 aziende demo della Wiki al documento allegato al ticket
(`Knowledge_Base_-_Use_case__(1).md`), che per ciascun verticale elenca le tipologie documentali e
ne marca alcune con una `X`.

Due richieste distinte nel ticket:
1. **Rivedere la natura delle aziende proposte** — verificare che le 3 aziende del registry
   rappresentino ancora correttamente i 3 verticali dell'allegato.
2. **Rivedere documentazione e ambiti trattati** — le voci marcate `X` devono diventare
   **documentazione consultabile** (interrogabile e citabile in chat); le voci senza `X` devono
   essere **solo menzionate**.

Il valore atteso è di demo: quando il cliente di un verticale chiede "avete le schede tecniche?" la
wiki deve poter aprire e citare un documento reale, mentre sulle voci senza `X` deve poter dire
"le trattiamo" senza esibire un documento.

## Contesto tecnico

Contesto coinvolto: **`apps/wiki`** (letto `apps/wiki/ARCHITECTURE.md`). Nessun impatto su
`@donq/security` né su `apps/finance`. Se non si aggiungono/rimuovono aziende, l'intervento è
**solo contenuto** (`content/<slug>/**`), eventualmente più `lib/usecases.ts` per taglines e
`suggestions`.

**Fatto architetturale che determina il significato di "consultabile"** (verificato sul codice, non
esplicitato oggi in ARCHITECTURE.md):

- Nessun modulo di runtime legge `content/<slug>/raw/`. Grep su `lib/`, `app/`, `components/`:
  zero riferimenti. `raw/` è la **provenienza per l'agente** (metodologia LLM Wiki), non un canale
  di consultazione per l'utente finale.
- L'unica cosa che arriva all'utente è `content/<slug>/graph.json`, prodotto da
  `scripts/wiki-graph.ts` scansionando **solo** `content/<slug>/wiki/**.md`, con esclusione di
  `SKIP_FILES = {index.md, log.md, readme.md, schema.md, overview.md}`.
- `lib/retrieval.ts` costruisce l'indice BM25 su `getGraph(slug).pages` (= i nodi del grafo);
  `lib/citations.ts` valida i `pageId` contro le stesse pagine; `GraphView` disegna quei nodi.

Conseguenza operativa, valida per tutti e tre i livelli dell'architettura:

| Livello | Ruolo | Visibile all'utente? |
|---|---|---|
| `content/<slug>/raw/` | fonte immutabile, provenienza | **No** (non caricata a runtime) |
| `content/<slug>/wiki/{sources,concepts,entities}/*.md` | nodi del grafo | **Sì** — retrieval BM25, citazioni, grafo, DocViewer |
| `content/<slug>/wiki/{index,overview,log,SCHEMA}.md` | navigazione/meta | **No** — esclusi dal grafo |
| `content/<slug>/graph.json` | artefatto derivato (gitignored) | è il canale |

Quindi: **ciò che sta solo in `raw/` o solo in `overview.md`/`index.md` non è consultabile.**
Contenuto e vincoli di scrittura: `content/<slug>/wiki/SCHEMA.md` per azienda; le pagine le scrive
l'agente, **nessuna pipeline LLM** (lezione appresa ARCHITECTURE §6).

### 1. Mappatura verticali dell'allegato → aziende del registry

| # | Verticale allegato | Slug | Azienda | Verticale dichiarato in `lib/usecases.ts` | Coerenza |
|---|---|---|---|---|---|
| 1 | Manifatturiero | `aurora` | Officine Meccaniche Aurora S.r.l. | "Manifatturiero" | ✅ 1:1 |
| 2 | Edilizia, costruzioni e impiantistica | `borealis` | Borealis Costruzioni S.p.A. | "Edilizia, costruzioni e impiantistica" | ✅ 1:1 (stringa identica) |
| 3 | Servizi professionali e studi tecnici | `meridian` | Meridian Studio Associato | "Servizi professionali e studi tecnici" | ✅ 1:1 (stringa identica) |

La biiezione verticale→azienda **esiste già** ed è quella decisa al Gate 1 di #262 (qa-log D1/D4).
Sul piano della *natura* (settore specifico, profilo, dimensione) le tre aziende sono plausibili e
rappresentative del proprio verticale. **Non emerge dal codice alcun disallineamento di mappatura**:
la parte "rivedere natura delle aziende" resta quindi la meno determinata della richiesta → **D1**.

Ciò che invece è disallineato è il **baricentro documentale** di ciascuna azienda (§ successivo).

### 2. Gap analysis per azienda — voci `X` vs contenuti attuali

Legenda stato: **OK** = fonte in `raw/` + pagina `sources/` + concetto dedicato (nodo del grafo).
**PARZIALE** = esiste un nodo del grafo sul tema ma nessun documento sorgente dedicato.
**ASSENTE** = né documento né nodo dedicato (al più una menzione di passaggio).

#### Aurora — Manifatturiero (32 nodi: 6 source, 18 concept, 8 entity)

| Voce marcata `X` | `raw/` | Nodo wiki dedicato | Stato |
|---|---|---|---|
| Schede tecniche di prodotto e componente | — | — (una sola menzione dentro `sources/06-vendite-garanzia-prodotto.md`) | **ASSENTE** |
| Manuali di montaggio, uso e manutenzione (fogli istruzione) | — | — (solo "montaggio" citato in `dpi`, `garanzia`) | **ASSENTE** |
| Listini e cataloghi tecnici | — | — (0 occorrenze reali: "catalogo" compare solo come sinonimo di `index.md`) | **ASSENTE** |
| Preventivi e proposte tecnico-economiche | — | — (0 occorrenze; "preventiva" compare solo in "manutenzione preventiva") | **ASSENTE** |

**Copertura: 0 su 4.**

Il resto dei contenuti Aurora insiste su voci **senza X** (non conformità e azioni correttive,
report di collaudo, dichiarazioni di conformità/certificazioni, know-how non scritto) oppure **fuori
elenco**: l'intero blocco HR (`onboarding`, `ferie-permessi`, `chiusure-aziendali`) e buona parte del
blocco Sicurezza (`dpi`, `sicurezza-emergenze`, `formazione-sicurezza`) non corrispondono a nessuna
voce dell'elenco manifatturiero. Le fonti `raw/` sono: manuale aziendale, manuale qualità ISO 9001,
memo sicurezza, HR onboarding/ferie, log manutenzione CNC, condizioni di vendita/garanzia.

Inoltre, **la maggior parte delle voci senza X di Aurora non è nemmeno menzionata**: 0 occorrenze per
distinte base/BOM, disegni tecnici e file CAD, schemi elettrici/pneumatici/idraulici, depliant
tecnico-commerciali, regole di configurazione e varianti, cicli di lavorazione, specifiche e
capitolati cliente, storico commesse, schede di sicurezza materiali.

#### Borealis — Edilizia (28 nodi: 6 source, 15 concept, 7 entity)

| Voce marcata `X` | `raw/` | Nodo wiki dedicato | Stato |
|---|---|---|---|
| Capitolati d'appalto e capitolati speciali | `01-capitolato-appalto.md` | `sources/01-capitolato-appalto` + `concepts/capitolato` | **OK** |
| Qualifiche e certificazioni subappaltatori, DURC | — (il DURC vive dentro `05-contratto-subappalto.md`) | `concepts/qualifica-subappaltatori`, `concepts/durc`, `entities/subappalti-fornitori` | **PARZIALE** |
| Elaborati grafici, tavole, modelli BIM | — | `concepts/bim-elaborati` | **PARZIALE** |
| Schede tecniche materiali, DoP, marcatura CE | `06-scheda-tecnica-dop.md` | `sources/06-scheda-tecnica-dop` + `concepts/marcatura-ce-dop` | **OK** |

**Copertura: 2 su 4 piena, 2 su 4 parziale.** È l'azienda oggi più vicina alla richiesta.

Voci **senza X** che oggi hanno invece un documento sorgente pieno: documentazione di sicurezza
PSC/POS (`raw/02`), computo metrico estimativo (`raw/03`), giornale dei lavori (`raw/04`), contratti
e subappalti (`raw/05`) → **4 dei 6 documenti sorgente stanno su voci senza X**.

#### Meridian — Servizi professionali (26 nodi: 6 source, 12 concept, 8 entity)

| Voce marcata `X` | `raw/` | Nodo wiki dedicato | Stato |
|---|---|---|---|
| Ricerca Semantica su knowledge interna | — | — (0 occorrenze) | **NON È UNA TIPOLOGIA DOCUMENTALE** → D2 |
| Storico pratiche e casi trattati | — | `concepts/storico-pratiche` + `entities/pratica-2025-098`, `pratica-2026-014`, `pratica-2026-021` | **PARZIALE** |
| Checklist operative e di compliance | — | `concepts/checklist-compliance` | **PARZIALE** |

**Copertura: 0 su 3 piena.**

Tutte e 6 le fonti `raw/` di Meridian stanno su voci **senza X**: procedura di gestione pratica
(→ "Metodologie e procedure interne"), template di relazione (→ "Modelli e template"), circolare
interpretativa (→ "Circolari, prassi e interpretazioni"), preventivo/proposta, verbale di riunione,
parere compilato (→ "Pareri e relazioni tecnico-professionali").

#### Quadro aggregato

- Voci `X` totali: **11** (4 + 4 + 3). Coperte in modo pieno oggi: **2** (entrambe in Borealis).
- Documenti sorgente totali: **18** (6 per azienda). Su voci `X`: **2**. Su voci senza `X` o fuori
  elenco: **16**.

La knowledge base attuale è stata derivata dall'elenco in #262 (qa-log D6) **prima** che l'elenco
portasse le marcature `X`: la distinzione consultabile/menzionata non era un criterio. Questa CR non
corregge un errore, aggiunge un criterio che prima non c'era.

### 3. Distinzione operativa "consultabile" vs "solo menzionata"

Definizioni proposte, verificabili automaticamente contro `graph.json` e il filesystem:

**Voce con `X` → CONSULTABILE.** Per quella voce, nell'azienda del verticale corrispondente
esistono tutti e tre i livelli:
- `raw/` — almeno un documento sorgente dedicato alla voce (il documento che l'utente si aspetta di
  "avere in azienda");
- `wiki/sources/<id>.md` — la pagina di sintesi di quel documento, quindi **un nodo del grafo**;
- il tema è raggiungibile: una domanda in linguaggio naturale sulla voce seleziona quella pagina tra
  quelle d'ingresso del retrieval, e la pagina è **citabile** (compare come citazione valida).
  Facoltativo ma coerente con lo SCHEMA: una pagina `concepts/` che spiega il processo attorno al
  documento.

**Voce senza `X` → SOLO MENZIONATA.** Per quella voce:
- **nessun** documento in `raw/` dedicato a quella voce;
- **nessun** nodo del grafo il cui titolo/tema sia quella voce;
- il tema compare come **testo dentro pagine esistenti** (una frase, un elenco, un riferimento in
  `concepts/` o in `overview.md`), così che l'assistente possa nominarlo ma non possa aprire né
  citare un documento su di esso.

Effetto atteso in chat (è il comportamento osservabile che conta):

| Domanda | Voce `X` | Voce senza `X` |
|---|---|---|
| "Avete <tipologia>?" | risposta di merito **con citazione** di una pagina dedicata | risposta che nomina la tipologia, **senza** citazione di una pagina dedicata |
| Grafo | esiste un nodo dedicato | nessun nodo dedicato |

> Attenzione: applicata alla lettera, la seconda definizione **impone di degradare contenuto già
> scritto e deliberato** (i 4 documenti Borealis su voci senza X, tutti e 6 quelli di Meridian, il
> blocco Qualità/Sicurezza/HR di Aurora). È la decisione più pesante della CR → **D3**.

## Comportamento atteso
(contratto verificabile — base da cui il test-author deriverà i test)

**B1 — Biiezione verticale ↔ azienda.** Il registry espone esattamente 3 aziende e i loro `vertical`
coprono i 3 verticali dell'allegato senza duplicati e senza verticali scoperti.

**B2 — Copertura delle voci `X`.** Per ogni azienda e per ogni voce marcata `X` del suo verticale
esiste almeno una pagina **nodo del grafo** dedicata a quella voce, e la voce ha un documento
sorgente dedicato in `content/<slug>/raw/`. Nessuna voce `X` resta senza copertura.

**B3 — Consultabilità effettiva.** Per ogni voce `X`, una query in linguaggio naturale che nomina la
voce restituisce dal retrieval dell'azienda almeno una pagina fra quelle dedicate a quella voce, e
quella pagina è citabile (id valido nel grafo di quello slug).

**B4 — Voci senza `X` = sola menzione.** Per ogni voce non marcata `X`: nessun documento in `raw/` e
nessun nodo del grafo dedicato a quella voce. Nel testo delle pagine la menzione e' **best-effort**
(dove il discorso la porta naturalmente): non e' richiesta una menzione testuale per ogni voce. La
copertura completa dell'elenco e' garantita invece dalla vetrina di B11.

> **Perimetro di B4**: l'elenco dell'allegato classifica **tipologie documentali**, non pagine. Le
> pagine che descrivono l'azienda in se' (entita': sedi, professionisti, clienti, commesse/pratiche;
> concetti di processo che fanno da hub) **non sono tipologie documentali** e non ricadono sotto B4:
> restano, e sono anzi il tessuto che tiene insieme il grafo (B7) e la profondita' (B8). B4 vieta il
> **documento sorgente dedicato** e la **pagina-documento** (`sources/`) per una voce senza `X`.

**B5 — Mappa voce→classificazione esplicita e verificabile.** Esiste, per ciascuna azienda, una mappa
esplicita `voce dell'allegato → {consultabile | menzionata}`, **unica fonte di verita'** sia per la
vetrina di B11 sia per i test: B2/B3/B4 si verificano meccanicamente contro `graph.json` e `raw/`
partendo da quella mappa, non a occhio. La mappa copre **tutte** le voci del verticale dell'azienda.

**B6 — Segregazione per-slug invariata.** Nessuna pagina di un'azienda cita o recupera contenuti di
un'altra (invariante B3 della spec #262).

**B7 — Salute del wiki invariata.** Dopo la modifica, `wiki:graph` + `wiki:lint` per ogni azienda:
**0 pagine orfane, 0 link non risolti, 0 summary mancanti** (livello raggiunto in #262 Fase B), grafo
non degenere, ogni pagina nelle sottocartelle con ≥2 link uscenti, frontmatter conforme allo
`SCHEMA.md` **della propria azienda**, id in kebab-case.

**B8 — Profondità comparabile tra aziende.** Le tre aziende restano confrontabili per numero di nodi:
**nessuna azienda sotto il 70% dei nodi della piu' ricca**. Il ribilanciamento (D3) puo' abbassare i
conteggi assoluti rispetto a oggi (32 / 28 / 26); non puo' sbilanciarli tra aziende.

**B9 — Registry coerente con i contenuti.** Se `tagline`/`suggestions` di un'azienda cambiano o se il
baricentro documentale si sposta, le `suggestions` mostrate nella chat vuota devono avere risposta
nei contenuti di quell'azienda. Vincoli #262 invariati: slug univoci, palette distinte, `xTitle`
**ASCII puro**.

**B10 — Nessuna pipeline LLM.** I contenuti li scrive l'agente; `wiki:graph` resta deterministico e
senza chiamate LLM; i `graph.json` restano artefatti gitignored rigenerati da `predev`/`prebuild`/
`pretest`.

**B11 — Vetrina degli ambiti nella homepage dell'azienda.** Chi apre `/wiki/<slug>` vede, prima
ancora di fare una domanda, **due gruppi distinti**:
- **ambiti trattati** — le voci `X`, coperte da documenti consultabili e citabili;
- **ambiti non coperti in questo POC** — le voci senza `X` del verticale, presentate come argomenti
  di cui il sistema *potrebbe* parlare in una versione definitiva e ad hoc per quell'azienda.

Ogni voce dell'elenco dell'allegato per quel verticale compare in **esattamente uno** dei due gruppi
(mappa di B5). Motivo: e' un POC — l'utente deve capire subito cosa trovera' e cosa no, senza doverlo
scoprire con domande a vuoto. Vincoli invariati: nessun contenuto di un'altra azienda (B6), palette e
`xTitle` ASCII del registry (B9).

## Constraint
- **`xTitle` ASCII puro** (`lib/usecases.ts`) — lezione appresa: un em-dash in un header rompe `fetch`.
- **Nessuna chiamata LLM in build** (ARCHITECTURE §6): niente `wiki-build.ts` redivivo.
- **Sanitizzazione markdown invariata** (`urlTransform` anti-XSS) — i nuovi contenuti non devono
  introdurre link/schemi che aggirino il sanitizer.
- **Sicurezza invariata**: `APP_NAMESPACE` resta `wiki`; rate-limit e budget restano condivisi tra
  aziende (scelta deliberata #262); nessuna modifica a `@donq/security`.
- **`lib/graph.ts`** ha import statici per slug: cambiare il set di aziende (D1c) tocca quel file e i
  `lib/usecases.ts`; **non cambiarlo mantiene l'intervento content-only**.
- `content/**` è in `dataProducingPaths` → categoria di test **non-regression** del playbook, il cui
  comando è oggi `<DA_DEFINIRE>`: prima/dopo va almeno confrontato l'output di `wiki:lint` e il
  conteggio nodi/archi per azienda.
- Stack invariato (Next.js 15 App Router, TypeScript, Tailwind v4, pnpm, Node 22+).

## Impact analysis

Changelog letto: `.ai-dev/changelog.md`. Due voci rilevanti, entrambe Productive #262.

1. **#262 Fase A (2026-06-30)** — introduce il multi use-case, il registry unico e la segregazione
   per-slug. **Nessuna rottura**: questa CR non tocca l'impianto. Resta vincolante il fatto che
   aggiungere/togliere un'azienda tocchi `lib/graph.ts` (import statici) e il registry.
2. **#262 Fase B (2026-07-07)** — completa Meridian a 26 nodi "a parità di profondità con Aurora (32)
   e Borealis (28)", con `wiki:lint` a 0 orfani / 0 link non risolti / 0 summary mancanti.
   **Non è rotta, ma è direttamente esposta**: un ribilanciamento che rimuove documenti sposta
   proprio quei numeri. B7 e B8 esistono per proteggere quella scelta.
3. **qa-log #262, D6** — "I ~30 documenti per azienda sono **derivati dagli elenchi del file MD** del
   task, per ciascun verticale". Questa CR **raffina** quella decisione, non la contraddice: l'elenco
   era lo stesso, ma senza le marcature `X`. L'allegato attuale è la versione `(1)`, che le contiene.
   → **Se al Gate 1 si sceglie la rimozione (D3c), si sta consapevolmente disfacendo lavoro
   deliberato di Fase A/B**: va messo agli atti nella voce di changelog di questa CR.
4. Nessun impatto su `@donq/security` e `apps/finance`.

### Drift rilevato in `apps/wiki/ARCHITECTURE.md` (da correggere in Fase 4)

- **§5** — "Ogni pagina in `content/wiki/{sources|concepts|entities}/<id>.md`": path **pre-multi
  use-case**. Il path reale è `content/<slug>/wiki/...`. La spec #262 aveva previsto l'aggiornamento
  di §1, §2, §7, §8: **§5 è rimasta indietro**.
- **§5** — il contratto di frontmatter dichiarato (`id, type, title, category, tags, summary`) con
  lista fissa di `category` (Azienda, Prodotti, Qualità, Sicurezza, HR, Operations, Commerciale) **non
  corrisponde a nessuna delle tre aziende**: Aurora non usa affatto `category` (né `id`, né `summary`;
  usa invece `sources:`), Borealis usa `Azienda|Commessa|Sicurezza|Qualità|Compliance|Operations|
  Commerciale|HR`, Meridian `Azienda|Pratica|Compliance|Normativa|Operations|Commerciale`. La
  tassonomia è di fatto **per-azienda**, definita in `content/<slug>/wiki/SCHEMA.md`.
- **§6** — cita `WIKI_SCHEMA.md`, file che non esiste più: oggi è `content/<slug>/wiki/SCHEMA.md`.
- **Lacuna, non drift** — ARCHITECTURE.md non dice da nessuna parte che **`raw/` non è caricato a
  runtime** e che `index/overview/log/SCHEMA` sono esclusi dal grafo. È esattamente il fatto che
  definisce "consultabile" in questa CR: da rendere esplicito in Fase 4.

### Fast-path

**NON eleggibile.** Valutazione informata dopo lettura del codice: l'intervento è, nella sua forma
minima (D3a, additivo), circa 8-9 nuovi documenti `raw/` più le rispettive pagine `sources/`, più i
`concepts/` di supporto, più l'aggiornamento di `index.md`/`overview.md`/`log.md` e dei wikilink
incrociati di 3 aziende. Ampiamente oltre la soglia di 20 righe, su `dataProducingPaths`, con
possibile modifica di `lib/usecases.ts`. Serve il percorso completo con piano.

## Decisioni al Gate 1 (registro completo in `.ai-dev/qa-log.md`, sezione #151)

| # | Domanda | Decisione |
|---|---|---|
| D1 | Natura delle aziende | **Nulla da cambiare**: mappatura gia' 1:1, si lavora solo su documenti e ambiti. |
| D2 | "Ricerca Semantica su knowledge interna" (X, Meridian) | *(assunzione)* Non e' un documento: e' la capability della demo. Compare nella vetrina B11 fra gli ambiti trattati, senza `raw/` dedicato. |
| D3 | Voci senza `X` con documenti pieni | **Ribilanciamento**: le `X` diventano consultabili, le non-`X` scendono a menzione. Si disfa consapevolmente parte del lavoro di #262 Fase A/B → va messo agli atti nel changelog. |
| D4 | Contenuti Aurora fuori elenco (HR, DPI, emergenze) | Conseguenza di D3: **degradati a menzione**; `suggestions` del registry riviste di conseguenza (B9). |
| D5 | Volume | *(assunzione)* 1 documento `raw/` + pagina `sources/` per voce `X`; profondita' governata da B8. |
| D6 | Ampiezza della menzione | **Best-effort** nel testo + **vetrina obbligatoria in homepage** (B11). |
| D7 | Perimetro | **Anche `lib/usecases.ts`**: tagline, `suggestions` e mappa degli ambiti (B5) possono vivere nel registry. |

Le due assunzioni (D2, D5) sono dell'orchestratore, non risposte esplicite dell'utente: se al Gate 1
non vengono contestate, valgono come parte della specifica approvata.
