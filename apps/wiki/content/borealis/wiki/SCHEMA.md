---
title: Schema del Wiki — Borealis KB
type: schema
updated: 2026-06-24
---

# Schema del Wiki — Borealis Costruzioni S.p.A.

Questo file descrive **come è strutturato e mantenuto** questo wiki. È la configurazione che
trasforma l'LLM in un manutentore disciplinato della knowledge base (vedi il pattern in
`../../CLAUDE.md`). Si co-evolve nel tempo. Verticale: **edilizia, costruzioni e impiantistica**.

## Tre livelli

1. **Sorgenti grezze** — `../raw/`. Documenti immutabili (capitolato, PSC/POS, computo, giornale dei
   lavori, contratti, schede tecniche). L'LLM legge, non modifica mai. Sono la fonte di verità.
2. **Il wiki** — questa cartella. Pagine markdown generate e mantenute dall'LLM.
3. **Lo schema** — questo file.

## Struttura cartelle

```
wiki/
  SCHEMA.md      questo file
  index.md       catalogo di tutte le pagine (orientato ai contenuti)
  log.md         registro cronologico append-only (ingest, query, lint)
  overview.md    sintesi di alto livello + tesi corrente
  sources/       una pagina di sintesi per ogni file in raw/
  entities/      cose con un nome proprio: azienda, sedi, persone, commesse, cantieri, fornitori
  concepts/      processi e concetti del verticale edile: commessa, SAL, varianti, sicurezza, ...
```

## Convenzioni di pagina

- **Frontmatter YAML** in cima a ogni pagina in `sources|concepts|entities`:
  ```yaml
  ---
  title: Titolo leggibile
  type: source | concept | entity
  category: Azienda | Commessa | Sicurezza | Qualità | Compliance | Operations | Commerciale | HR
  tags: [commessa, sicurezza, ...]
  summary: una riga di sintesi
  updated: 2026-06-24
  ---
  ```
  L'**id** della pagina è il nome del file in kebab-case (es. `psc-pos.md` → id `psc-pos`).
- **Cross-reference** con wikilink `[[id-esatto|testo]]`, dove `id` è il nome di un'altra pagina.
  Collegare generosamente: i collegamenti sono preziosi quanto le pagine. Ogni pagina ha più link
  uscenti.
- **Citazioni alle fonti**: quando un'affermazione viene da una sorgente, citarla, es.
  *(fonte: [[01-capitolato-appalto]])*.
- **Niente stub**: ogni pagina dice qualcosa di utile (almeno 2-3 sezioni).
- **Contraddizioni / lacune**: segnalarle in un blocco `> [!warning]` o `> [!question]`.

## Pagine hub (nodi centrali del grafo del verticale edile)

Tenere ben collegati i concetti che toccano più reparti/fasi:

- [[commessa]] — l'unità di lavoro: tutto le fa capo.
- [[sicurezza-cantiere]] — cerniera tra DVR, PSC/POS e qualifica imprese.
- [[sal]] — cerniera tra esecuzione, contabilità e pagamenti.
- [[varianti-progetto]] — cerniera tra capitolato/computo, BIM e SAL.
- [[qualifica-subappaltatori]] — cerniera tra Compliance (SOA/DURC), Sicurezza (POS) e Commerciale.
- [[subappalti-fornitori]] — hub di entità per le imprese terze e i fornitori.

## Workflow

**Ingest.** Per ogni file in `raw/`: leggerlo → scrivere/aggiornare la pagina in `sources/` →
aggiornare le pagine `entities/` e `concepts/` toccate → aggiornare [[index]] → appendere una riga a
[[log]].

**Query.** Leggere prima [[index]], poi entrare nel dettaglio. Rispondere con citazioni. Le risposte
di valore si archiviano come nuove pagine.

**Lint.** Cercare: contraddizioni, affermazioni obsolete, pagine orfane (senza link in entrata),
concetti citati senza pagina, cross-reference mancanti, lacune da colmare.

## Convenzione log

Ogni riga inizia con un prefisso costante: `## [2026-06-24] ingest | Titolo`. Così
`grep "^## \[" log.md | tail -5` dà gli ultimi eventi.
