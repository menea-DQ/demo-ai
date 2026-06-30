<!-- ai-dev-flow:start -->
Questo progetto usa AI-Dev Flow. Le istruzioni operative sono in AGENT.md (agnostico).
Leggi AGENT.md e seguilo. Versione del processo: vedi flow.lock.json.
<!-- ai-dev-flow:end -->

# CLAUDE.md — Donq Demos (monorepo)

Guida comune per chi (incluso un futuro agente) lavora su questo **monorepo** di demo AI di Donq.
Contiene ciò che è **trasversale a tutte le demo** (struttura, sicurezza condivisa, comandi, deploy,
lezioni apprese). I dettagli **specifici di ogni app** stanno nei rispettivi file `ARCHITECTURE.md`.

> ⚠️ **PRIMA DI OPERARE, LEGGI ANCHE L'`ARCHITECTURE.md` DELL'APP CHE STAI MODIFICANDO.**
> - Modifiche a `apps/wiki/**` → leggi **[apps/wiki/ARCHITECTURE.md](apps/wiki/ARCHITECTURE.md)**.
> - Modifiche a `apps/finance/**` → leggi **`apps/finance/ARCHITECTURE.md`** *(da creare quando si
>   svilupperà la UI/feature di finance)*.
> - Modifiche a `packages/security/**` → riguardano TUTTE le app: leggi questo file e valuta l'impatto
>   su entrambe (§3).
> Leggi il file Architecture **corretto** in base a dove fai la modifica; questo CLAUDE.md da solo non basta.

## 1. Struttura del monorepo (pnpm workspace)
```
apps/
  wiki/        Demo "Aurora Wiki" — chat documentale (LLM Wiki + OpenRouter). Vedi ARCHITECTURE.md.
  finance/     Demo "Aurora Finance" — interrogazione dati finanziari da SQLite. (ARCHITECTURE.md TBD)
packages/
  security/    @donq/security — sicurezza condivisa (vedi §3).
deploy/        nginx.conf + docker-compose.prod.yml (monorepo). Vedi DEPLOY.md.
```
Package manager **pnpm**. Node 22+. Le app sono Next.js 15 (App Router) + TypeScript + Tailwind v4.

## 2. Comandi
```bash
pnpm install
docker compose up -d            # Redis condiviso su localhost:6379

pnpm dev:wiki                   # wiki in dev (http://localhost:3000)
pnpm dev:finance                # finance in dev (PORT=3002 pnpm --filter @donq/finance dev)
pnpm build:wiki                 # build singola app
pnpm -r build                   # build di tutte le app
```
Ogni app ha il proprio `.env.local` (vedi `apps/<app>/.env.example`). I segreti NON si committano.

## 3. Sicurezza condivisa — `@donq/security` (`packages/security/`)
Tutta la logica di sicurezza è qui, **una volta sola**, e parametrizzata da `APP_NAMESPACE`.
Moduli: `config` (legge le env), `redis`, `session` (cookie HMAC), `rateLimit`, `budget`, `turnstile`,
`http` (getClientIp, jsonResponse, cookie helpers). Esporta tutto da `index.ts`.

### Segregazione tra app (requisito chiave)
`APP_NAMESPACE` (es. `wiki`, `finance`) prefissa **chiavi Redis** e **nome cookie**:
`wiki:rl:<ip>` vs `finance:rl:<ip>`, `wiki:budget:<data>` vs `finance:budget:<data>`,
cookie `wiki_sid` vs `finance_sid`. → Stesso IP, **contatori indipendenti** tra le demo.

### Difese (uguali per tutte le app)
| Difesa | Modulo | Note |
|---|---|---|
| Rate limit **N richieste / finestra** per IP | `rateLimit` (sliding window Redis) | chiave = IP → persiste a refresh e a cancellazione cookie. |
| **Budget globale giornaliero** | `budget` | limite "hard" anti-drain; **vero backstop** se l'IP è falsificabile. |
| **Sessioni concorrenti** | `budget` | set Redis con TTL/heartbeat, chiave = `sid`. |
| **Anti-bot Turnstile** | `turnstile` | verificato server-side all'avvio sessione; in prod se mancano le chiavi → blocca. |
| **Sessione firmata** (HMAC) | `session` | cookie httpOnly, SameSite=Strict, Secure in prod; `/api/session` **riusa il sid** se valido. |
| **SESSION_SECRET guard** | `config.insecureSessionSecret` | in prod blocca se segreto = default o < 16 char. |
| Chiave LLM / segreti | — | solo lato server, mai nel bundle client. |

### Env comuni (gestite da @donq/security)
`APP_NAMESPACE`, `REDIS_URL`, `SESSION_SECRET`, `SESSION_TTL_SEC`, `RATE_LIMIT_MAX`,
`RATE_LIMIT_WINDOW_SEC`, `DAILY_GLOBAL_BUDGET`, `MAX_CONCURRENT_SESSIONS`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. (Le env specifiche stanno nell'app.)

### Punti di attenzione noti (accettabili per demo)
- `getClientIp` si fida di `x-forwarded-for`: **in prod serve un reverse proxy che lo sovrascrive**
  (vedi `DEPLOY.md`); altrimenti il rate-limit per-IP è aggirabile. Il budget globale resta il limite hard.
- Rate-limit/budget sono **consumati prima** dell'azione costosa (fail-closed sui crediti).
- Se Redis è irraggiungibile, le route falliscono (fail-closed): nessun consumo, demo ferma finché Redis non torna.

## 4. Deploy
Vedi **[DEPLOY.md](DEPLOY.md)**: Dockerfile per-app (build dal contesto workspace), `deploy/docker-compose.prod.yml`
(wiki + finance + Redis), `deploy/nginx.conf` (reverse proxy che **sovrascrive** `x-forwarded-for`,
una app per sottodominio, buffering off per lo streaming).

## 5. Lezioni apprese comuni (NON ripeterle)
1. **Sessione**: `/api/session` deve **riusare il `sid`** dal cookie valido — altrimenti ogni refresh
   azzera i limiti e crea sessioni concorrenti fantasma.
2. **Header HTTP solo ASCII**: un em-dash (—) in un header (`X-Title`) fa fallire `fetch` di undici con
   "Connection error". Tenere gli header in ASCII puro.
3. **`urlTransform` di react-markdown**: non disabilitare la sanitizzazione con `(url)=>url` (XSS); usare
   un sanitizer che blocca `javascript:`/`data:`.
4. **Segreti**: `SESSION_SECRET` forte in prod (guard attivo); chiavi mai nel bundle client.
5. **Costi/LLM**: dove si usa un LLM, consumare i limiti **prima** della chiamata e impostare un tetto
   (token + budget globale + eventuale spend limit lato provider).

## 6. Git
Repo: `git@github-work:menea-DQ/demo-ai.git`, branch `main`. `.env.local`, `node_modules`, `.next`,
`content/graph.json` e `data/*.db` sono ignorati (artefatti/segreti).
