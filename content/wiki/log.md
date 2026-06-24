---
title: Log — Knowledge Base Aurora
type: log
updated: 2026-06-24
---

# Log

Registro cronologico append-only. Ogni riga inizia con `## [data] tipo | titolo` per essere
parsabile (`grep "^## \[" log.md | tail -5`).

## [2026-06-24] setup | Inizializzazione wiki
Creato lo scaffold del wiki secondo il pattern in `../CLAUDE.MD`. Definite le convenzioni in
[[SCHEMA]]: cartelle `sources/`, `entities/`, `concepts/`; frontmatter YAML; cross-reference con
wikilink Obsidian; pagine hub. Lingua: italiano (coerente con le fonti).

## [2026-06-24] ingest | Batch iniziale — 6 fonti
Ingestite tutte e 6 le fonti grezze in un'unica passata.
- Fonti: [[01-manuale-aziendale]], [[02-manuale-qualita-iso9001]], [[03-memo-sicurezza]],
  [[04-hr-onboarding-ferie]], [[05-log-manutenzione-cnc]], [[06-vendite-garanzia-prodotto]].
- Create 7 entità: [[officine-meccaniche-aurora]], [[stabilimento-vimercate]],
  [[stabilimento-agrate]], [[linea-cuscinetti-ax]], [[organizzazione-reparti]], [[reparto-qualita]],
  [[carla-moretti]], [[stefano-riva]].
- Creati 18 concetti (qualità, sicurezza, HR, manutenzione, commerciale) — vedi [[index]].
- Identificate 5 pagine hub/cerniera: [[non-conformita]], [[area-blocco-merci]], [[rilascio-lotto]],
  [[formazione-sicurezza]], [[chiusure-aziendali]].
- Sintesi e tesi corrente scritte in [[overview]] ("nessun pezzo dubbio esce dallo stabilimento").
- Connessioni non ovvie registrate: fermo macchina→NC condizionale; chiusure↔manutenzione;
  formazione↔audit; collaudo↔spedizione.
- Lacune annotate in [[index]] (persone mancanti, dati prodotto numerici, KPI, procedure parziali).

## [2026-06-24] lint | Verifica integrità link
Controllo automatico: nessun wikilink orfano (ogni `[[...]]` punta a una pagina esistente), nessuna
pagina senza link in entrata. Dettaglio nel messaggio di chiusura ingest.
