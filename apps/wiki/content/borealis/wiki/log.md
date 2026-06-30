---
title: Log — Knowledge Base Borealis
type: log
updated: 2026-06-24
---

# Log

Registro cronologico append-only. Ogni riga inizia con `## [data] tipo | titolo` per essere
parsabile (`grep "^## \[" log.md | tail -5`).

## [2026-06-24] setup | Inizializzazione wiki
Creato lo scaffold del wiki secondo il pattern in `../../CLAUDE.md`. Definite le convenzioni in
[[SCHEMA]]: cartelle `sources/`, `entities/`, `concepts/`; frontmatter YAML con `category`;
cross-reference con wikilink; pagine hub. Verticale: edilizia/costruzioni/impiantistica. Lingua:
italiano (coerente con le fonti).

## [2026-06-24] ingest | Batch iniziale — 6 fonti (commessa C-2025-014)
Ingestite tutte e 6 le fonti grezze della commessa "Residenze Aurora".
- Fonti: [[01-capitolato-appalto]], [[02-psc-pos]], [[03-computo-metrico]], [[04-giornale-lavori]],
  [[05-contratto-subappalto]], [[06-scheda-tecnica-dop]].
- Create 7 entità: [[borealis-costruzioni]], [[sede-milano]], [[cantiere-residenze-aurora]],
  [[cantiere-via-tortona]], [[subappalti-fornitori]], [[marco-ferraro]], [[elena-bianchi]].
- Creati 15 concetti del verticale edile (commessa, capitolato, computo, SAL, varianti, collaudo,
  sicurezza-cantiere, PSC/POS, DVR, qualifica subappaltatori, DURC, giornale lavori, BIM/elaborati,
  DDT, marcatura CE/DoP) — vedi [[index]].
- Identificate 6 pagine hub/cerniera: [[commessa]], [[sicurezza-cantiere]], [[sal]],
  [[varianti-progetto]], [[qualifica-subappaltatori]], [[subappalti-fornitori]].
- Sintesi e tesi corrente scritte in [[overview]] (la commessa come unità di lavoro).
- Connessioni non ovvie registrate: POS↔qualifica (sicurezza è anche ammissione); DURC↔pagamento SAL;
  giornale↔prova di SAL/varianti; DoP isolante↔dato energetico; imprevisto scavo↔variante.
- Lacune annotate in [[index]] (persone mancanti, portafoglio commesse, KPI, DVR/NTC non tra le fonti).

## [2026-06-24] lint | Verifica integrità link
Controllo: ogni `[[...]]` punta a una pagina esistente (sources/entities/concepts); nessuna pagina
senza link in entrata. Le pagine hub risultano i nodi più collegati, coerente con [[SCHEMA]].
