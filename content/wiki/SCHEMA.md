---
title: Schema del Wiki — Aurora KB
type: schema
updated: 2026-06-24
---

# Schema del Wiki — Officine Meccaniche Aurora

Questo file descrive **come è strutturato e mantenuto** questo wiki. È la configurazione che
trasforma l'LLM in un manutentore disciplinato della knowledge base (vedi il pattern in
`../CLAUDE.MD`). Si co-evolve nel tempo.

## Tre livelli

1. **Sorgenti grezze** — `../raw/`. Documenti immutabili (manuali, memo, log). L'LLM legge, non
   modifica mai. Sono la fonte di verità.
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
  entities/      cose con un nome proprio: azienda, sedi, prodotti, persone, reparti
  concepts/      processi e concetti trasversali: NC, collaudo, ISO 9001, garanzia, ...
```

## Convenzioni di pagina

- **Frontmatter YAML** in cima a ogni pagina:
  ```yaml
  ---
  title: Titolo leggibile
  type: entity | concept | source | index | log | overview | schema
  tags: [reparto/qualita, processo, ...]
  sources: [02-manuale-qualita-iso9001]   # quali file raw alimentano la pagina
  updated: 2026-06-24
  ---
  ```
- **Cross-reference** con wikilink Obsidian `[[nome-file-senza-estensione]]`. Collegare
  generosamente: i collegamenti sono preziosi quanto le pagine.
- **Citazioni alle fonti**: quando un'affermazione viene da una sorgente, citarla con il suo
  codice, es. *(fonte: [[02-manuale-qualita-iso9001]])*.
- **Niente stub**: ogni pagina deve dire qualcosa di utile. Se un'idea è troppo piccola per una
  pagina, va come sezione di una pagina più grande.
- **Contraddizioni / lacune**: segnalarle esplicitamente in un blocco `> [!warning]` o
  `> [!question]` invece di nasconderle.

## Pagine hub

Alcuni concetti sono nodi centrali del grafo perché toccano più reparti. Tenerli ben collegati:

- [[non-conformita]] — collega Qualità, Manutenzione, Resi, Montaggio prodotto.
- [[area-blocco-merci]] — dove finisce tutto ciò che è bloccato (NC e resi).
- [[rilascio-lotto]] — cerniera tra Collaudo e Spedizione/Vendite.
- [[formazione-sicurezza]] — cerniera tra Sicurezza, Onboarding e Audit qualità.
- [[chiusure-aziendali]] — cerniera tra HR e Manutenzione programmata.

## Workflow

**Ingest.** Per ogni nuovo file in `raw/`: leggerlo → scrivere/aggiornare la pagina in
`sources/` → aggiornare le pagine `entities/` e `concepts/` toccate → aggiornare [[index]] →
appendere una riga a [[log]].

**Query.** Leggere prima [[index]] per trovare le pagine rilevanti, poi entrare nel dettaglio.
Rispondere con citazioni. Le risposte di valore vanno archiviate come nuove pagine.

**Lint.** Cercare: contraddizioni, affermazioni obsolete, pagine orfane (senza link in entrata),
concetti citati ma senza pagina, cross-reference mancanti, lacune da colmare.

## Convenzione log

Ogni riga inizia con un prefisso costante per essere parsabile:
`## [2026-06-24] ingest | Titolo`. Così `grep "^## \[" log.md | tail -5` dà gli ultimi eventi.
