# Deploy in produzione — Aurora Wiki

Guida al deploy self-hosted (Node always-on + Redis) **dietro reverse proxy**, con focus sul punto
di sicurezza più delicato: rendere affidabile l'IP del client per il rate-limit per-IP.

## Perché serve un reverse proxy che "sovrascrive" X-Forwarded-For
L'app identifica il client tramite l'header `x-forwarded-for` (vedi `lib/http.ts → getClientIp`), di
cui legge il **primo** valore. Il problema: un client può inviare un proprio `X-Forwarded-For` falso.
Se l'app è esposta direttamente, o se il proxy **accoda** invece di sovrascrivere, un bot può cambiare
header a ogni richiesta e azzerare il rate-limit per-IP.

Regole per renderlo sicuro:
1. **L'app ascolta solo su `127.0.0.1`** (non pubblicata verso l'esterno) → l'unico ingresso è il proxy.
2. **Il proxy SOVRASCRIVE `X-Forwarded-For`** con l'IP reale di chi si connette (`$remote_addr`), scartando
   qualunque valore inviato dal client.

> Nota: anche nello scenario peggiore (IP falsificabile), il **budget globale giornaliero**
> (`lib/budget.ts`) resta il limite "hard" che protegge i crediti su tutta l'app.

---

## Opzione A — nginx sull'host (consigliata)
Dà l'IP reale del client senza complicazioni.

1. **Avvia app + Redis** (l'app resta su `127.0.0.1:3000`):
   ```bash
   cp .env.example .env.production    # compila i valori (vedi sotto)
   docker compose -f deploy/docker-compose.prod.yml up -d --build
   ```
2. **Installa la config nginx** ([deploy/nginx.conf](deploy/nginx.conf)) sull'host:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/aurora
   sudo ln -s /etc/nginx/sites-available/aurora /etc/nginx/sites-enabled/aurora
   sudo nginx -t && sudo systemctl reload nginx
   ```
   La parte chiave:
   ```nginx
   proxy_pass http://127.0.0.1:3000;
   proxy_set_header X-Forwarded-For $remote_addr;   # SOVRASCRIVE (non accoda)
   proxy_set_header X-Real-IP       $remote_addr;
   proxy_buffering off;                              # streaming chat NDJSON
   ```
3. **TLS**: con certbot → `sudo certbot --nginx -d aurora.example.com`.

### Dietro una CDN (es. Cloudflare)
Lì `$remote_addr` è l'IP della CDN. Abilita `ngx_http_realip_module`, fidati solo dei range della CDN e
leggi l'header con l'IP reale (`CF-Connecting-IP`) — esempio commentato in `deploy/nginx.conf`.

---

## Opzione B — tutto in Docker (nginx in compose)
In Docker, con le porte pubblicate sul bridge, nginx vedrebbe come IP sorgente il **gateway Docker**,
non il client → il rate-limit per-IP sarebbe inutile. Per preservare l'IP reale, su **Linux** si usa
un container nginx in `network_mode: "host"` che fa proxy verso `127.0.0.1:3000`:

```yaml
  nginx:
    image: nginx:1.27-alpine
    network_mode: "host"        # solo Linux: nginx vede l'IP reale
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: unless-stopped
```
(con `network_mode: host` l'app va comunque pubblicata su `127.0.0.1:3000` e nginx fa `proxy_pass http://127.0.0.1:3000`).
Su macOS/Windows `network_mode: host` non funziona allo stesso modo: usa l'Opzione A.

### Come verificare che l'IP non sia falsificabile
```bash
curl -H 'X-Forwarded-For: 1.2.3.4' https://aurora.example.com/api/session -X POST -d '{}'
```
Controlla in Redis (`redis-cli KEYS 'rl:*'`) che la chiave usi l'IP reale, non `1.2.3.4`.

---

## Variabili d'ambiente di produzione (`.env.production`)
| Var | Note |
|---|---|
| `OPENROUTER_API_KEY` | chiave OpenRouter (runtime, risposte chat) |
| `OPENROUTER_MODEL` | default `google/gemini-2.5-flash` |
| `SESSION_SECRET` | **`openssl rand -hex 32`** — ≥16 char, NON il default (altrimenti l'app si blocca in prod) |
| `REDIS_URL` | `redis://redis:6379` (nome servizio nel compose) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | **obbligatorie in prod** (anti-bot) |
| `NEXT_PUBLIC_APP_URL` | URL pubblico (usato come `HTTP-Referer` verso OpenRouter) |
| `DAILY_GLOBAL_BUDGET` | tetto domande/giorno su tutta l'app (default 500) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_SEC` | limite per-IP (default 10 / 1800) |
| `MAX_CONCURRENT_SESSIONS` | sessioni concorrenti (default 50) |

> Suggerimento: imposta anche uno **spend limit nativo su OpenRouter** come tetto hard in euro,
> indipendente dalla logica applicativa.

## Checklist sicurezza prod
- [ ] App pubblicata solo su `127.0.0.1` (mai 0.0.0.0 esposto).
- [ ] Proxy che **sovrascrive** `X-Forwarded-For`.
- [ ] TLS attivo (HTTPS).
- [ ] `SESSION_SECRET` forte e casuale.
- [ ] Chiavi Turnstile configurate.
- [ ] Spend limit impostato su OpenRouter.
