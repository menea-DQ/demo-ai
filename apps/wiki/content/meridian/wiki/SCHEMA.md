---
title: Schema del Wiki — Meridian KB
type: schema
updated: 2026-06-24
---

# Schema del Wiki — Meridian Studio Associato

Questo file descrive **come è strutturato e mantenuto** questo wiki. È la configurazione che
trasforma l'LLM in un manutentore disciplinato della knowledge base dello Studio. Si co-evolve
nel tempo.

## Tre livelli

1. **Sorgenti grezze** — `../raw/`. Documenti immutabili (procedure interne, template, circolari,
   verbali). L'LLM legge, non modifica mai. Sono la fonte di verità.
2. **Il wiki** — questa cartella. Pagine markdown generate e mantenute dall'LLM.
3. **Lo schema** — questo file.

## Struttura cartelle

```
wiki/
  SCHEMA.md      questo file
  index.md       catalogo di tutte le pagine
  log.md         registro cronologico append-only (ingest, query, lint)
  overview.md    sintesi di alto livello dello Studio
  sources/       una pagina di sintesi per ogni file in raw/
  entities/      cose con un nome proprio: lo Studio, soci/professionisti, pratiche di esempio
  concepts/      processi e concetti trasversali: parere tecnico, fascicolo pratica, compliance, ...
```

## Convenzioni di pagina

- **Frontmatter YAML** in cima a ogni pagina:
  ```yaml
  ---
  title: Titolo leggibile
  type: source | concept | entity
  category: Azienda | Pratica | Compliance | Normativa | Operations | Commerciale
  tags: [pratica, compliance, ...]
  summary: Una riga che riassume la pagina.
  updated: 2026-06-24
  ---
  ```
- **id = nome file in kebab-case.** I cross-reference usano wikilink `[[id|testo visibile]]`.
  Collegare generosamente: i collegamenti sono preziosi quanto le pagine. Ogni pagina nelle
  sottocartelle ha **almeno 2 link uscenti** verso pagine esistenti.
- **Citazioni alle fonti**: quando un'affermazione viene da una sorgente, citarla per id,
  es. *(fonte: [[01-procedura-gestione-pratica]])*.
- **Niente stub**: ogni pagina dice qualcosa di utile.
- **Contraddizioni / lacune**: segnalarle in un blocco `> [!warning]` o `> [!question]`.

## Pagine hub

Nodi centrali del grafo, da tenere ben collegati:

- [[fascicolo-pratica]] — cerniera tra Pratica, Operations e Compliance.
- [[parere-tecnico]] — cerniera tra Pratica, Normativa e know-how dei senior.
- [[checklist-compliance]] — cerniera tra Compliance e Operations.

## Workflow

**Ingest.** Per ogni nuovo file in `raw/`: leggerlo → scrivere/aggiornare la pagina in `sources/` →
aggiornare le pagine `entities/` e `concepts/` toccate → aggiornare [[index]] → appendere una riga
a [[log]].

**Query.** Leggere prima [[index]], poi entrare nel dettaglio. Rispondere con citazioni. Le risposte
di valore vanno archiviate come nuove pagine.

**Lint.** Cercare: contraddizioni, affermazioni obsolete, pagine orfane, concetti citati ma senza
pagina, cross-reference mancanti, lacune da colmare.

## Convenzione log

Ogni riga inizia con un prefisso costante: `## [2026-06-24] ingest | Titolo`. Così
`grep "^## \[" log.md | tail -5` dà gli ultimi eventi.
