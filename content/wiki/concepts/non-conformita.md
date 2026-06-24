---
title: Non Conformità (NC)
type: concept
tags: [processo, qualita, hub]
sources: [02-manuale-qualita-iso9001, 05-log-manutenzione-cnc, 06-vendite-garanzia-prodotto, 01-manuale-aziendale]
updated: 2026-06-24
---

# Non Conformità (NC)

**Pagina hub.** La non conformità è il concetto che lega più reparti di tutto il wiki: nasce in
Qualità, ma può essere innescata da Produzione/Manutenzione, dal Montaggio prodotto e dai Resi
cliente. È la concretizzazione della filosofia "nessun pezzo dubbio esce dallo stabilimento"
([[officine-meccaniche-aurora]]).

## Cos'è
Un pezzo o un processo che non rispetta le specifiche. Chi lo rileva apre una NC sul gestionale
**entro fine turno** (codice prodotto, lotto, difetto). Le NC da [[collaudo]] sono aperte in
automatico.

## Ciclo di vita
1. **Apertura** + **isolamento** del pezzo in [[area-blocco-merci]].
2. **Classificazione**: scarto · rilavorazione · deroga.
3. **Trattamento**:
   - *Scarto* → rottamazione.
   - *Rilavorazione* → rientra in produzione e si **ricollauda**.
   - *Deroga* → la autorizza **[[stefano-riva|il Responsabile Qualità]]** con evidenza documentale.
4. **Chiusura** dopo trattamento e verifica.
5. Se il difetto è **ricorrente** → si apre un'[[azioni-correttive|azione correttiva]].

## Da dove arrivano le NC (i trigger)
- **Collaudo** ([[collaudo]]): caratteristica critica ◆ fuori limite, prove AX (rotazione,
  rumorosità, gioco) negative. → vedi [[tolleranze-classi-precisione]].
- **Manutenzione/Produzione** ([[manutenzione-preventiva]]): un guasto CNC che impatta la qualità.
  *Esempio reale 02/04: vibrazione anomala su CNC-04, sospetto gioco cuscinetto → NC aperta*
  (fonte: [[05-log-manutenzione-cnc]]).
- **Montaggio prodotto** ([[linea-cuscinetti-ax]]): danno da montaggio a percussione diretta
  sull'anello.
- **Resi cliente** ([[resi-reclami-rma]]): un reso analizzato e risultato difettoso genera una NC;
  le NC da reso vanno incrociate con la pratica di reso.

> [!note] Regola dura
> Una **caratteristica critica ◆ fuori limite non è MAI derogabile**: il lotto è bloccato. La deroga
> esiste solo per casi diversi e richiede autorizzazione del Responsabile Qualità.

## Collega a
[[area-blocco-merci]] · [[collaudo]] · [[azioni-correttive]] · [[tolleranze-classi-precisione]] ·
[[resi-reclami-rma]] · [[manutenzione-preventiva]] · [[linea-cuscinetti-ax]] · [[rilascio-lotto]]

## Fonti
[[02-manuale-qualita-iso9001]] · [[05-log-manutenzione-cnc]] · [[06-vendite-garanzia-prodotto]] ·
[[01-manuale-aziendale]]
