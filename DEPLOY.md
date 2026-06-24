# Deploy in produzione — Donq Demos (monorepo)

Guida al deploy self-hosted delle demo (`apps/wiki`, `apps/finance`, …) **dietro reverse proxy**, con
Redis condiviso e limiti **segregati per app**. Focus sul punto di sicurezza più delicato: rendere
affidabile l'IP del client per il rate-limit per-IP.

## Perché serve un reverse proxy che "sovrascrive" X-Forwarded-For
Le app identificano il client tramite `x-forwarded-for` (vedi `@donq/security → getClientIp`), di cui
leggono il **primo** valore. Un client può però inviare un `X-Forwarded-For` falso: se l'app è esposta
direttamente, o il proxy **accoda** invece di sovrascrivere, un bot può azzerare il rate-limit per-IP.

Regole:
1. **Le app ascoltano solo su `127.0.0.1`** (porte diverse) → unico ingresso = il proxy.
2. **Il proxy SOVRASCRIVE `X-Forwarded-For`** con l'IP reale (`$remote_addr`).

> Anche nello scenario peggiore (IP falsificabile), il **budget globale giornaliero** resta il limite
> "hard" che protegge i crediti, separatamente per ciascuna app (`<ns>:budget:<data>`).

## Build & runtime (Docker, monorepo)
Ogni app ha un `Dockerfile` che builda **dal contesto della root del workspace** (per risolvere il
pacchetto condiviso `@donq/security`). Le immagini girano con `next start` (porta interna 3000).

```bash
# env di produzione per ciascuna app (NON committare: contengono i segreti)
cp apps/wiki/.env.example    apps/wiki/.env.production
cp apps/finance/.env.example apps/finance/.env.production
#  → in ENTRAMBE: REDIS_URL=redis://redis:6379 ; SESSION_SECRET forte ; chiavi Turnstile
#  → APP_NAMESPACE distinti: wiki / finance (segregazione dei limiti su Redis)

docker compose -f deploy/docker-compose.prod.yml up -d --build
#  wiki    → 127.0.0.1:3000
#  finance → 127.0.0.1:3001
#  redis   → condiviso (volume persistente)
```

## Reverse proxy (nginx sull'host) — una app per sottodominio
Installa [deploy/nginx.conf](deploy/nginx.conf):
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/donq
sudo ln -s /etc/nginx/sites-available/donq /etc/nginx/sites-enabled/donq
sudo nginx -t && sudo systemctl reload nginx
```
Punti chiave (per ogni server block):
```nginx
proxy_pass http://127.0.0.1:3000;          # 3001 per finance
proxy_set_header X-Forwarded-For $remote_addr;   # SOVRASCRIVE (no spoofing)
proxy_set_header X-Real-IP       $remote_addr;
proxy_buffering off;                         # streaming chat NDJSON (wiki)
```
TLS con certbot: `sudo certbot --nginx -d wiki.example.com -d finance.example.com`.

### Dietro una CDN (es. Cloudflare)
`$remote_addr` sarebbe l'IP della CDN: abilita `ngx_http_realip_module`, fidati solo dei range della CDN
e leggi `CF-Connecting-IP` (esempio commentato in `deploy/nginx.conf`).

### Perché nginx sull'host e non in compose
In Docker (bridge + porte pubblicate) nginx vedrebbe l'IP del **gateway Docker**, non del client →
rate-limit per-IP inutile. Su Linux, in alternativa, un container nginx con `network_mode: "host"` che fa
proxy verso `127.0.0.1:300x`.

### Verifica che l'IP non sia falsificabile
```bash
curl -H 'X-Forwarded-For: 1.2.3.4' https://wiki.example.com/api/session -X POST -d '{}'
# poi: redis-cli KEYS 'wiki:rl:*'  → deve usare l'IP reale, non 1.2.3.4
```

## Variabili d'ambiente
Comuni (gestite da `@donq/security`, in ogni `.env.production`):
| Var | Note |
|---|---|
| `APP_NAMESPACE` | **distinto per app** (`wiki`, `finance`) — segrega chiavi Redis e cookie |
| `REDIS_URL` | `redis://redis:6379` (servizio compose) |
| `SESSION_SECRET` | **`openssl rand -hex 32`** — ≥16 char, NON il default (in prod l'app si blocca) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_SEC` | default 10 / 1800 |
| `DAILY_GLOBAL_BUDGET` | tetto richieste/giorno per app (default 500) |
| `MAX_CONCURRENT_SESSIONS` | default 50 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | **obbligatorie in prod** |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_CONTACT_URL` | URL pubblico / CTA contatti |

Specifiche per app: la wiki aggiunge `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `LLM_MAX_TOKENS`
(vedi `apps/wiki/.env.example`). Finance non usa LLM nello scaffold attuale.

> Suggerimento: imposta anche uno **spend limit nativo su OpenRouter** come tetto hard in euro per la wiki.

## Checklist sicurezza prod
- [ ] App pubblicate solo su `127.0.0.1` (mai 0.0.0.0 esposto).
- [ ] Proxy che **sovrascrive** `X-Forwarded-For`.
- [ ] TLS attivo (HTTPS) su ogni sottodominio.
- [ ] `SESSION_SECRET` forte e casuale (per app).
- [ ] `APP_NAMESPACE` distinto per app.
- [ ] Chiavi Turnstile configurate.
- [ ] Spend limit su OpenRouter (wiki).
