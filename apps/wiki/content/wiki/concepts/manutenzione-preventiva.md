---
title: Manutenzione preventiva CNC
type: concept
tags: [produzione, manutenzione]
sources: [05-log-manutenzione-cnc, 04-hr-onboarding-ferie, 06-vendite-garanzia-prodotto]
updated: 2026-06-24
---

# Manutenzione preventiva CNC

Ogni centro di lavoro CNC di [[stabilimento-vimercate]] ha un **piano di manutenzione preventiva**.

## Cadenze
Interventi **giornalieri, settimanali e annuali**. Gli **interventi maggiori** si pianificano
durante le [[chiusure-aziendali]] per non fermare la produzione.

## Lubrificazione
- **Guide e mandrini**: secondo le schede macchina.
- **Cuscinetti montati**: valgono le indicazioni del manuale prodotto — **grasso al litio NLGI 2**
  (cfr. [[linea-cuscinetti-ax]]).
- I lubrificanti si prelevano dal **magazzino ricambi**.

## Sicurezza macchina
- Procedura **LOTO** (blocco e segnalazione delle energie) **prima di ogni intervento**.
- Attenzione agli **organi in movimento**; principio d'incendio → procedure antincendio
  ([[sicurezza-emergenze]]).

## Guasti e fermi
- Un guasto si registra come **"fermo macchina"** sul gestionale.
- Se il guasto **impatta la qualità** del prodotto si valuta l'apertura di una [[non-conformita|NC]].
- I **ricambi critici** si tengono a scorta.

## Estratti registro (esempi)
| Data | Macchina | Evento | Esito qualità |
|------|----------|--------|----------------|
| 12/03 | CNC-04 | cambio olio mandrino; rilubrificazione AX-200 di prova | ok |
| 18/03 | CNC-02 | fermo 3h, sensore di posizione sostituito | nessun impatto → **nessuna NC** |
| 02/04 | CNC-04 | vibrazione anomala in [[collaudo]], sospetto gioco cuscinetto | **NC aperta**, avvisata Qualità |

Il confronto 18/03 vs 02/04 mostra la regola in azione: il fermo macchina diventa NC **solo** quando
tocca la qualità del prodotto.

## Collega a
[[chiusure-aziendali]] · [[non-conformita]] · [[collaudo]] · [[linea-cuscinetti-ax]] ·
[[sicurezza-emergenze]] · [[stabilimento-vimercate]]

## Fonti
[[05-log-manutenzione-cnc]] · [[04-hr-onboarding-ferie]] · [[06-vendite-garanzia-prodotto]]
