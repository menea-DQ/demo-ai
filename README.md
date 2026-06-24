# Donq Demos — Monorepo

Monorepo delle demo AI di Donq. La **logica di sicurezza è condivisa** in un unico pacchetto e ogni
demo è un'app a sé; i limiti d'uso su Redis sono **segregati per app** (stesso IP → contatori indipendenti).

```
apps/
  wiki/        Demo "Aurora Wiki" — chat documentale (LLM Wiki + OpenRouter) — vedi apps/wiki/CLAUDE.md
  finance/     Demo "Aurora Finance" — interrogazione dati finanziari da SQLite
packages/
  security/    @donq/security — sessione firmata, rate-limit per-IP, budget globale, sessioni
               concorrenti, Turnstile. Chiavi Redis e cookie prefissati da APP_NAMESPACE.
```

## Sicurezza condivisa (`@donq/security`)
Stessa logica per tutte le demo: 10 richieste / 30 min per IP (sliding window Redis), budget globale
giornaliero, limite sessioni concorrenti, anti-bot Turnstile, cookie di sessione firmato (HMAC).
**Segregazione**: ogni app imposta `APP_NAMESPACE` (es. `wiki`, `finance`) → chiavi `wiki:rl:<ip>` vs
`finance:rl:<ip>`, cookie `wiki_sid` vs `finance_sid`. Una richiesta sul wiki **non** scala i limiti del
finance, anche dallo stesso IP.

## Avvio
```bash
pnpm install
docker compose up -d                 # Redis condiviso (localhost:6379)

# Wiki
cp apps/wiki/.env.example apps/wiki/.env.local      # OPENROUTER_API_KEY, SESSION_SECRET, APP_NAMESPACE=wiki
pnpm dev:wiki                                        # http://localhost:3000

# Finance
cp apps/finance/.env.example apps/finance/.env.local # SESSION_SECRET, APP_NAMESPACE=finance
pnpm dev:finance                                     # (PORT=3002 pnpm --filter @donq/finance dev)
```
Build: `pnpm build:wiki` / `pnpm build:finance` (o `pnpm -r build`).

## Deploy
Modello reverse proxy / IP affidabile in [DEPLOY.md](DEPLOY.md). NB: i file Docker (`Dockerfile`,
`deploy/`) sono da **adattare al monorepo** (build per-app con contesto workspace) — TODO.

## Documentazione
- [apps/wiki/CLAUDE.md](apps/wiki/CLAUDE.md) — architettura della demo wiki (LLM Wiki, OpenRouter, sicurezza).
- [DEPLOY.md](DEPLOY.md) — deploy e sicurezza del reverse proxy.

Demo realizzate da **Donq**. I dati delle aziende di esempio sono inventati a scopo dimostrativo.
