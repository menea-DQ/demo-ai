---
title: Collaudo
type: concept
tags: [processo, qualita]
sources: [02-manuale-qualita-iso9001, 06-vendite-garanzia-prodotto, 05-log-manutenzione-cnc]
updated: 2026-06-24
---

# Collaudo

Processo di verifica della Qualità ([[reparto-qualita]]) articolato in **tre fasi**. Ogni fase
registra **esito e operatore**.

## Le tre fasi
1. **Accettazione materie prime**.
2. **Controllo in processo**.
3. **Collaudo finale**.

## Cosa si controlla
- Sui cuscinetti [[linea-cuscinetti-ax|AX]]: prove di **rotazione, rumorosità e gioco** (parametri da
  scheda prodotto).
- **Controlli dimensionali** secondo la classe di precisione
  ([[tolleranze-classi-precisione]]); le **caratteristiche critiche ◆ al 100%**.
- Strumenti (micrometri, comparatori, CMM) con [[taratura-strumenti|taratura valida]]:
  uno strumento fuori taratura **non può** essere usato per l'accettazione.

## Esiti
- Esito negativo / critica ◆ fuori limite → si apre una [[non-conformita|NC]] (in automatico).
- Tutte le fasi positive → **[[rilascio-lotto|rilascio del lotto]]**, che abilita la spedizione.

Il collaudo è anche un punto di intercettazione dei problemi macchina: la vibrazione anomala del
02/04 (CNC-04) è emersa **proprio in collaudo prove rotazione** (fonte: [[05-log-manutenzione-cnc]]).

## Collega a
[[non-conformita]] · [[rilascio-lotto]] · [[tolleranze-classi-precisione]] · [[taratura-strumenti]] ·
[[linea-cuscinetti-ax]] · [[reparto-qualita]]

## Fonti
[[02-manuale-qualita-iso9001]] · [[06-vendite-garanzia-prodotto]] · [[05-log-manutenzione-cnc]]
