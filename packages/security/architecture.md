# Architettura — packages/security
> Descrive il sistema com'è ORA. Niente storia, niente "prima era", niente "attualmente".
> Se questo documento è in drift rispetto al codice, segnalalo: un doc stantio è peggio di nessun doc.

## Cos'è questo contesto
`@donq/security`: la logica di sicurezza condivisa da tutte le app del monorepo (wiki, finance),
scritta **una volta sola** e parametrizzata da `APP_NAMESPACE`. Risolve il problema di applicare le
stesse difese (rate limit, budget, sessioni firmate, anti-bot) in modo coerente su più demo, mantenendo
però **contatori indipendenti** tra un'app e l'altra.

## Come si incastrano i pezzi
Moduli in `src/` (riesportati tutti da `index.ts`):
- `config` — legge le env e ne ricava la configurazione (incl. `insecureSessionSecret` guard).
- `redis` — client Redis condiviso.
- `session` — cookie di sessione firmato HMAC (httpOnly, SameSite=Strict, Secure in prod).
- `rateLimit` — sliding window su Redis, chiave = IP.
- `budget` — budget globale giornaliero (backstop anti-drain) e sessioni concorrenti (set Redis con TTL/heartbeat, chiave = sid).
- `turnstile` — verifica anti-bot Cloudflare Turnstile lato server.
- `http` — helper: `getClientIp`, `jsonResponse`, cookie helpers.

## Invarianti
- **Segregazione tra app**: `APP_NAMESPACE` (es. `wiki`, `finance`) prefissa chiavi Redis e nome cookie
  (`wiki:rl:<ip>` vs `finance:rl:<ip>`, cookie `wiki_sid` vs `finance_sid`). Stesso IP ⇒ contatori indipendenti.
- **Fail-closed**: rate-limit e budget si consumano PRIMA dell'azione costosa; se Redis è irraggiungibile le route falliscono (nessun consumo).
- **Segreti solo lato server**: chiavi/segreti mai nel bundle client.
- **SESSION_SECRET guard**: in prod blocca se il segreto è il default o < 16 caratteri.
- **Riuso del sid**: `/api/session` riusa il sid da un cookie valido (non azzera i limiti a ogni refresh).
- **Header HTTP solo ASCII** (lezione appresa): un em-dash in un header rompe `fetch` di undici.

## Dove si modifica in sicurezza
- Nuova difesa o modifica a una difesa esistente → nel modulo dedicato in `src/`, riesportando da `index.ts`.
- Nuova env condivisa → in `config` (e documentarla in CLAUDE.md §3 "Env comuni").
- Qualunque cambiamento qui impatta **tutte** le app: valutarne l'effetto su wiki e finance prima di procedere.
- Le env specifiche di una singola app NON vanno qui: stanno nell'app.

## Confini e dipendenze
- Consumato da: `apps/wiki` e `apps/finance` (import da `@donq/security`).
- Dipende da: Redis (condiviso) e, per l'anti-bot, dal servizio Cloudflare Turnstile.
- `getClientIp` si fida di `x-forwarded-for`: in prod richiede un reverse proxy che lo sovrascrive
  (vedi DEPLOY.md), altrimenti il rate-limit per-IP è aggirabile; il budget globale resta il limite hard.
