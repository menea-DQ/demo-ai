// Configurazione condivisa di sicurezza, letta dalle variabili d'ambiente.
// APP_NAMESPACE segrega le chiavi Redis e il cookie per ogni demo (es. "wiki", "finance"),
// così la stessa persona/IP ha contatori indipendenti tra le diverse app.

function num(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function str(name: string, def = ""): string {
  return process.env[name] ?? def;
}

const namespace = str("APP_NAMESPACE", "app");

export const sec = {
  /** prefisso di segregazione (chiavi Redis e nome cookie) */
  namespace,

  // --- Redis ---
  redisUrl: str("REDIS_URL", "redis://localhost:6379"),

  // --- Sessione ---
  sessionSecret: str("SESSION_SECRET", "dev-insecure-secret-change-me"),
  sessionTtlSec: num("SESSION_TTL_SEC", 1800),
  sessionCookieName: `${namespace}_sid`,

  // --- Rate limit per IP ---
  rateLimitMax: num("RATE_LIMIT_MAX", 10),
  rateLimitWindowSec: num("RATE_LIMIT_WINDOW_SEC", 1800),

  // --- Budget globale giornaliero ---
  dailyGlobalBudget: num("DAILY_GLOBAL_BUDGET", 500),

  // --- Sessioni concorrenti ---
  maxConcurrentSessions: num("MAX_CONCURRENT_SESSIONS", 50),

  // --- Cloudflare Turnstile ---
  turnstileSiteKey: str("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
  turnstileSecret: str("TURNSTILE_SECRET_KEY"),
};

/** chiave Redis namespaced */
export const k = (suffix: string) => `${sec.namespace}:${suffix}`;

export const turnstileEnabled = Boolean(sec.turnstileSecret && sec.turnstileSiteKey);
export const isProd = process.env.NODE_ENV === "production";

/** In prod il SESSION_SECRET di default (pubblico) renderebbe i cookie falsificabili. */
export const insecureSessionSecret =
  isProd && (sec.sessionSecret === "dev-insecure-secret-change-me" || sec.sessionSecret.length < 16);
