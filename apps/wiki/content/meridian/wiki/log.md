---
title: Log del Wiki — Meridian
type: log
updated: 2026-07-07
---

# Log — Meridian Studio Associato

## [2026-06-24] init | Creato wiki Meridian (seed)
Creato il set iniziale: SCHEMA, index, overview. Ingerite 2 fonti raw (PR-03, TM-07).

## [2026-06-24] ingest | 01-procedura-gestione-pratica
Sintetizzata la procedura PR-03 → fonte + concetti [[fascicolo-pratica]], [[checklist-compliance]].

## [2026-06-24] ingest | 02-template-relazione-tecnica
Sintetizzato il template TM-07 → fonte + concetto [[parere-tecnico]]. Creata entità di esempio
[[pratica-2026-014]] e [[meridian-studio]].

## [2026-07-07] ingest | 03-circolare-interpretativa-normativa
Sintetizzata la nota tecnica NT-12 (circolare Comune di Bologna prot. 45782/2026) → fonte + concetto
[[circolari-e-prassi]]. Creata entità [[comune-di-bologna]].

## [2026-07-07] ingest | 04-preventivo-proposta-tecnico-economica
Sintetizzato il template TM-11 → fonte + concetto [[preventivo-proposta]] + concetto
[[modelli-e-template]].

## [2026-07-07] ingest | 05-verbale-riunione-interna
Sintetizzato il verbale riunione soci del 03/06/2026 → fonte + concetti [[verbale-riunione-interna]],
[[know-how-senior]], [[corrispondenza-enti-clienti]]. Create entità [[ing-laura-ferrari]],
[[arch-marco-bianchi]], [[pratica-2026-021]].

## [2026-07-07] ingest | 06-parere-compilato-esempio
Sintetizzata la relazione compilata della pratica storica 2025-098 → fonte + concetto
[[storico-pratiche]]. Creata entità [[pratica-2025-098]].

## [2026-07-07] refactor | sede-bologna, linee-guida-categoria
Scorporata l'entità [[sede-bologna]] da [[meridian-studio]]. Aggiunto il concetto
[[linee-guida-categoria]] (standard degli ordini professionali). Aggiornati index e overview.
Fase B (Productive #262) completata: content/meridian portato a parità con Aurora/Borealis.


## [2026-08-18] ingest | Revisione degli ambiti documentali (ticket #151)
Allineamento all'elenco delle tipologie documentali del verticale servizi professionali. Diventano
consultabili lo storico pratiche e casi trattati e le checklist operative e di compliance; la
"ricerca semantica sulla knowledge interna" resta una capability della demo, non un documento. Le
sei fonti precedenti (procedura PR-03, template TM-07 e TM-11, nota tecnica NT-12, verbale di
riunione, relazione compilata) **non sono più documenti consultabili**: restano menzionate nelle
pagine di processo. Ri-titolate tre pagine che coincidevano con una tipologia non consultabile.
Grafo: 22 pagine, 0 orfani, 0 link rotti.
