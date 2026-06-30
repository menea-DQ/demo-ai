# Specifica — Evoluzione AI Demo Wiki: multi use-case selezionabili
ticket: Productive #262 (18687019) · tipo: CR · data: 2026-06-30 · stato: approvata

## Obiettivo
Trasformare la demo Wiki da **singola azienda fittizia ("Aurora")** a **piattaforma multi
use-case**: l'utente, dalla landing, sceglie tra **N aziende** (una per verticale del documento
allegato al task) ed entra nella wiki di quella azienda. Ogni azienda ha **nome proprio**,
**palette colori distinta** e **propri documenti** interrogabili. Tutto ciò che oggi si fa per
Aurora (chat con citazioni, pagine collegate, knowledge graph) deve funzionare identico per
ciascuna azienda.

Set use-case (3 totali, deciso al gate intake):
1. **Manifatturiero** → riuso l'azienda esistente *Officine Meccaniche Aurora S.r.l.* (slug `aurora`).
2. **Edilizia, costruzioni e impiantistica** → azienda nuova (nome + palette + ~30 pagine da creare).
3. **Servizi professionali e studi tecnici** → azienda nuova (nome + palette + ~30 pagine da creare).

Nomi/palette proposti (regolabili al GATE 1):
- Edilizia → **"Borealis Costruzioni S.p.A."** — palette amber/terracotta/slate.
- Servizi → **"Meridian Studio Associato"** — palette emerald/teal/indigo.

## Contesto tecnico
Contesto coinvolto: **`apps/wiki`** (letto `apps/wiki/ARCHITECTURE.md`). Nessuna modifica a
`@donq/security` né a `apps/finance`. Stack invariato: Next.js 15 App Router + Tailwind v4.

Stato attuale che vincola il design (da ARCHITECTURE.md + codice):
- Contenuti **cotti a build-time**: `lib/graph.ts` fa `import graphJson from "@/content/graph.json"`
  → **un solo** grafo, derivato da `content/wiki/**` via `scripts/wiki-graph.ts` (predev/prebuild).
- Nome azienda **hardcoded** in 6 file: `app/layout.tsx`, `app/page.tsx`, `components/WikiApp.tsx`,
  `components/ChatPanel.tsx`, `lib/llm.ts`, `lib/wiki-answer.ts`.
- Colori: **un unico** blocco `@theme` in `app/globals.css` (global).
- Metodologia "LLM Wiki": le pagine le **scrive l'agente** seguendo `content/WIKI_SCHEMA.md`,
  **NON** una pipeline LLM a pagamento (lezione appresa §6) — vale anche per le 2 aziende nuove.

Forma tecnica prevista (dettaglio in Fase 2/piano, non vincolante qui):
- **Registry use-case** unica fonte di verità: `{ slug, companyName, vertical, tagline, colors,
  assistantName }`.
- Contenuti per-azienda: `content/<slug>/wiki/**` → `content/<slug>/graph.json` (Aurora migra in
  `content/aurora/`). `wiki:graph` genera un graph.json per ogni azienda.
- Selezione a **route**: landing = galleria aziende; `/wiki/<slug>` = wiki di quell'azienda.

## Comportamento atteso
(contratto verificabile — base per il test-author)

**B1 — Landing come galleria.** La home elenca **tutte** le aziende del registry (≥3). Ogni card
mostra: nome azienda, verticale, e un segno cromatico della sua palette. Cliccando una card si
naviga a `/wiki/<slug>` di quell'azienda.

**B2 — Wiki per-use-case.** `/wiki/<slug>` per uno slug valido mostra la wiki di quell'azienda:
il **nome azienda** compare in header, nome assistente, footer (nessun nome di un'altra azienda).
Slug **inesistente** → 404 (non deve mostrare una wiki vuota o quella di un'altra azienda).

**B3 — Segregazione dei contenuti (invariante chiave).** Una domanda posta nella wiki dell'azienda
X recupera e cita **solo** documenti di X. Retrieval, citazioni e grafo non attingono mai ai
contenuti di un'altra azienda. (Test: data una pagina che esiste solo in Y, una query in X non la
può citare.)

**B4 — Tema per azienda.** I colori applicati in `/wiki/<slug>` derivano dalla config di
quell'azienda; due aziende diverse rendono palette **distinte** (token colore osservabili diversi).

**B5 — Registry unica fonte.** Nome, verticale, palette e nome-assistente di ogni azienda vengono
**dal registry**. Nessun letterale "Aurora" residuo nei punti parametrizzati (i 6 file sopra leggono
dalla config dell'azienda attiva).

**B6 — Identità delle 2 aziende nuove.** Ciascuna ha: nome azienda inventato, palette distinta, e
**~30 pagine** di contenuti collegati (`sources/`, `concepts/`, `entities/` + `index.md`) coerenti
col proprio verticale e scritte secondo `WIKI_SCHEMA.md`. Le pagine sono interconnesse con wikilink
`[[id|testo]]` (il grafo dell'azienda non è degenere: ha nodi e archi).

**B7 — Pipeline grafo multi-azienda.** `pnpm --filter @donq/wiki wiki:graph` genera **un**
`graph.json` per **ciascuna** azienda; il runtime carica quello corretto in base allo slug della
route. `wiki:lint` resta utilizzabile per ogni azienda.

**B8 — API parametrizzate per use-case.** `/api/chat` (e `/api/session` se necessario) ricevono lo
slug dell'azienda attiva e usano i suoi contenuti + nome nel system prompt + `X-Title`. Lo slug è
**validato** server-side contro il registry; slug ignoto → errore controllato, nessuna chiamata LLM.

## Constraint
- **Header HTTP solo ASCII** (lezione comune): i nomi azienda usati in `X-Title`/header vanno
  sanificati ad ASCII (niente accenti/em-dash) — gli inventati siano ASCII-safe o sanificati.
- **Sanitizzazione markdown** invariata (anti-XSS `urlTransform`); i wikilink restano `wiki:`.
- **Segreti** solo lato server; nessuna chiave nel bundle client.
- **Sicurezza condivisa invariata**: rate-limit, budget globale giornaliero, sessione firmata
  restano `@donq/security`. Decisione deliberata: `APP_NAMESPACE` resta **`wiki`** — le aziende sono
  use-case **dentro la stessa app**, quindi condividono i limiti di sicurezza (la segregazione è sui
  **contenuti**, B3, non sui contatori). Budget giornaliero condiviso tra le aziende.
- **Costo LLM**: nessuna pipeline LLM per costruire le pagine nuove (lezione §6) — le scrive
  l'agente. Limiti consumati prima della chiamata, invariato.

## Impact analysis
Changelog inizializzato il 2026-06-30: nessuna scelta deliberata passata viene rotta. Due punti di
attenzione architetturali:
- Si **abbandona** l'assunzione "un solo `content/graph.json` importato staticamente": passa a
  N graph per-azienda selezionati per route. → richiede aggiornamento di
  `apps/wiki/ARCHITECTURE.md` in Fase 4 (§2, §8, e §1 "Cos'è").
- La route cambia da `/wiki` (singola) a `/wiki/<slug>`: prevedere il comportamento del vecchio
  path (redirect alla galleria o all'azienda di default) — da confermare al gate.
- Rispettata la lezione §6 (niente build a pagamento del wiki) e le lezioni comuni (header ASCII,
  XSS, segreti).

## Domande aperte → vedi qa-log.md
Risolte al GATE 1 (2026-06-30):
- Nomi/palette confermati: Edilizia = "Borealis Costruzioni S.p.A." (amber/terracotta/slate);
  Servizi = "Meridian Studio Associato" (emerald/teal/indigo).
- Vecchio path `/wiki` → **redirect alla galleria** (home).
- I ~30 documenti per azienda sono **derivati dagli elenchi del file MD** del task, per ciascun
  verticale (B6 confermato).
