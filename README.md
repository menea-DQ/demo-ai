# Aurora Wiki - Demo AI documentale (LLM Wiki) · Donq

Demo da far provare ai clienti: ricerca e Q&A documentale in stile *chat + wiki interconnessa*.
L'utente chatta con il knowledge base di una PMI manifatturiera di esempio ("Officine Meccaniche
Aurora S.r.l."), ottiene risposte **con le fonti citate** e naviga tra le **pagine collegate**, anche
tramite un **knowledge graph** interattivo.

## 🧠 Architettura: vero LLM Wiki (metodologia Karpathy)
Non è un RAG "chunk + similarità". Segue la metodologia **LLM Wiki** a 3 livelli:

1. **`content/raw/`** - sorgenti immutabili (documenti aziendali grezzi e disordinati). Verità di base.
2. **`content/wiki/`** - pagine markdown **generate dall'LLM** (tipi: `sources/`, `concepts/`, `entities/`,
   più `index.md` e `log.md`), interconnesse con wikilink `[[id|testo]]`.
3. **`content/WIKI_SCHEMA.md`** - le convenzioni che guidano la costruzione.

Operazioni (come da metodologia):
- **Ingest** (a cura dell'**agente Claude Code**, NON a runtime): l'agente legge le sorgenti in `content/raw/`
  e, seguendo `content/WIKI_SCHEMA.md`, scrive a mano le pagine in `content/wiki/` (concept/entity/source)
  interconnesse con `[[id|testo]]`. Nessuna chiamata API a questo passo: è l'agente a costruire il wiki.
- **Query** (runtime): si selezionano le pagine d'ingresso più pertinenti e si **seguono i collegamenti**
  del wiki; l'LLM risponde citando le pagine (pre-sintetizzate → risposte migliori e coerenti).
- **Lint** (`pnpm wiki:lint`): salute del wiki (orfani, link non risolti, pagine senza summary).

Il grafo `content/graph.json` è derivato dalle pagine (`pnpm wiki:graph`, automatico prima di dev/build).

## 🤖 Modello: OpenRouter (Gemini 2.5 Flash)
Le chiamate LLM **a runtime** (risposte in chat) passano da **OpenRouter** (API OpenAI-compatibile).
La costruzione del wiki NON usa l'API. Modello consigliato: **`google/gemini-2.5-flash`** - veloce ed
economico. Configurabile via env (`OPENROUTER_MODEL`); alternative: `openai/gpt-4o-mini`,
`meta-llama/llama-3.3-70b-instruct`.

## ✨ Esperienza
- **Chat** in linguaggio naturale (streaming).
- **Citazioni cliccabili**: ogni risposta apre la pagina wiki sorgente con la **porzione evidenziata**.
- **Pagine collegate** + **grafo** navigabile (drag, zoom, pan; nodi colorati per categoria).

## 🔒 Sicurezza (configurabile via env)
| Difesa | Come |
|---|---|
| Max **10 domande / 30 min** per utente | sliding window atomico su Redis (IP + cookie di sessione firmato) |
| **Anti-bot** | Cloudflare Turnstile verificato server-side all'avvio sessione |
| **Anti drain crediti** | budget globale giornaliero (hard stop) + limite token risposta |
| **Anti flooding** | limite di sessioni concorrenti |
| Robustezza | store condiviso **Redis** (non in-memory) |
| Superato un limite | modale dedicata + **CTA al form contatti Donq** |

La chiave OpenRouter è usata SOLO lato server (mai nel bundle client).

## 🚀 Avvio in locale
Requisiti: Node ≥ 20, pnpm, Docker (Redis).

```bash
pnpm install
cp .env.example .env.local        # compila OPENROUTER_API_KEY e SESSION_SECRET
docker compose up -d              # Redis su localhost:6379
pnpm dev                          # http://localhost:3000 (rigenera graph.json dalle pagine wiki)
```

> Le pagine in `content/wiki/` sono un artefatto committato (costruito dall'agente seguendo
> `content/WIKI_SCHEMA.md`). `dev`/`build` rigenerano solo `graph.json` dalle pagine, senza LLM.

Comandi wiki:
- `pnpm wiki:graph` - rigenera `content/graph.json` dalle pagine
- `pnpm wiki:lint` - health check del wiki (orfani, link non risolti)

## ⚙️ Env principali
Vedi [.env.example](.env.example):
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default `google/gemini-2.5-flash`)
- `REDIS_URL`, `SESSION_SECRET`
- `RATE_LIMIT_MAX` (10), `RATE_LIMIT_WINDOW_SEC` (1800)
- `DAILY_GLOBAL_BUDGET` (500), `MAX_CONCURRENT_SESSIONS` (50)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_CONTACT_URL` (default `https://donq.io/contacts`)

## 🏗️ Struttura
```
app/             landing, /wiki, API (session, chat)
components/      WikiApp, ChatPanel, DocViewer, GraphView, LimitModal, Markdown
lib/             env, llm (OpenRouter), redis, session, rateLimit, budget, turnstile,
                 retrieval, wiki-answer, citations, graph
content/raw/     sorgenti immutabili
content/wiki/    pagine generate dall'LLM (artefatto)
scripts/         wiki-graph (deriva graph.json), wiki-lint
```

## 🚢 Deploy (self-hosted)
Stack pronto in [DEPLOY.md](DEPLOY.md): `Dockerfile` (output standalone) + `deploy/docker-compose.prod.yml`
(app su `127.0.0.1:3000` + Redis) + `deploy/nginx.conf` (reverse proxy che **sovrascrive**
`x-forwarded-for` per un rate-limit per-IP affidabile, con buffering off per lo streaming).
In **produzione**: `SESSION_SECRET` forte + chiavi Turnstile obbligatorie. Vedi la guida per dettagli,
varianti CDN/Docker e checklist di sicurezza.

---
Demo realizzata da **Donq**. I dati di "Officine Meccaniche Aurora S.r.l." sono inventati a scopo dimostrativo.
