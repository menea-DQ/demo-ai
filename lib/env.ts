// Configurazione centralizzata letta dalle variabili d'ambiente.
// Tutti i limiti di sicurezza sono qui e regolabili senza toccare il codice.

function num(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function str(name: string, def = ""): string {
  return process.env[name] ?? def;
}

export const env = {
  // --- OpenRouter (OpenAI-compatible) ---
  openrouterApiKey: str("OPENROUTER_API_KEY"),
  openrouterBaseUrl: str("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  // modello per le risposte (chat) e per la pipeline di costruzione del wiki
  llmModel: str("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
  buildModel: str("OPENROUTER_BUILD_MODEL", str("OPENROUTER_MODEL", "google/gemini-2.5-flash")),
  maxOutputTokens: num("LLM_MAX_TOKENS", 1024),
  appUrl: str("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // --- Redis ---
  redisUrl: str("REDIS_URL", "redis://localhost:6379"),

  // --- Sessione ---
  sessionSecret: str("SESSION_SECRET", "dev-insecure-secret-change-me"),
  sessionTtlSec: num("SESSION_TTL_SEC", 1800), // 30 min
  sessionCookieName: "aurora_sid",

  // --- Rate limit per utente ---
  rateLimitMax: num("RATE_LIMIT_MAX", 10), // domande
  rateLimitWindowSec: num("RATE_LIMIT_WINDOW_SEC", 1800), // 30 min

  // --- Budget globale (anti drain crediti) ---
  dailyGlobalBudget: num("DAILY_GLOBAL_BUDGET", 500), // domande/giorno su tutta l'app

  // --- Sessioni concorrenti (anti flooding) ---
  maxConcurrentSessions: num("MAX_CONCURRENT_SESSIONS", 50),

  // --- Input ---
  maxQuestionLen: num("MAX_QUESTION_LEN", 600),

  // --- Cloudflare Turnstile ---
  turnstileSiteKey: str("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
  turnstileSecret: str("TURNSTILE_SECRET_KEY"),

  // --- Link CTA (form contatti Donq) ---
  contactCtaUrl: str("NEXT_PUBLIC_CONTACT_URL", "https://donq.io/contacts"),
};

/** Turnstile è attivo solo se entrambe le chiavi sono presenti. */
export const turnstileEnabled = Boolean(env.turnstileSecret && env.turnstileSiteKey);

export const isProd = process.env.NODE_ENV === "production";

/**
 * In produzione il SESSION_SECRET di default (pubblico nel codice) renderebbe i cookie
 * di sessione falsificabili: in quel caso il servizio va bloccato.
 */
export const insecureSessionSecret =
  isProd && (env.sessionSecret === "dev-insecure-secret-change-me" || env.sessionSecret.length < 16);
