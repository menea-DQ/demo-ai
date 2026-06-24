---
title: Tolleranze e classi di precisione
type: concept
tags: [qualita, tecnico]
sources: [02-manuale-qualita-iso9001]
updated: 2026-06-24
---

# Tolleranze e classi di precisione

Regole di accettazione dimensionale usate in [[collaudo]] e dichiarate nel codice della
[[linea-cuscinetti-ax]].

## Classi di precisione
**P0, P6, P5** — dove **P5 è la più precisa** ed è il **default per la robotica**. La classe è
l'ultimo campo del codice prodotto `AX-<famiglia>-<diametro>-<classe>`.

## Caratteristiche critiche ◆
Le quote critiche sono marcate con il simbolo **◆** e usano **tolleranze geometriche GD&T**
(cilindricità, run-out, parallelismo). Si controllano **al 100%**.

## Criterio di accettazione del lotto
- Un lotto è accettabile **se TUTTE le caratteristiche critiche rientrano nei limiti**.
- Le caratteristiche **non critiche** seguono un **piano di campionamento**.

> [!warning] Regola non derogabile
> Se **anche una sola** caratteristica critica ◆ è fuori limite, il **lotto è bloccato** e la cosa
> **non è MAI derogabile**. Si apre una [[non-conformita|NC]] e il materiale va in
> [[area-blocco-merci]]. Contrasta con la deroga ordinaria, che invece [[stefano-riva|il
> Responsabile Qualità]] può autorizzare per casi non critici.

## Collega a
[[collaudo]] · [[non-conformita]] · [[linea-cuscinetti-ax]] · [[rilascio-lotto]] ·
[[taratura-strumenti]]

## Fonti
[[02-manuale-qualita-iso9001]]
