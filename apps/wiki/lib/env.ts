// Configurazione SPECIFICA dell'app wiki (la parte di sicurezza è in @donq/security).
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
  // --- OpenRouter (risposte chat, runtime) ---
  openrouterApiKey: str("OPENROUTER_API_KEY"),
  openrouterBaseUrl: str("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  llmModel: str("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
  maxOutputTokens: num("LLM_MAX_TOKENS", 1024),
  appUrl: str("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // --- Input ---
  maxQuestionLen: num("MAX_QUESTION_LEN", 600),

  // --- CTA (form contatti Donq) ---
  contactCtaUrl: str("NEXT_PUBLIC_CONTACT_URL", "https://donq.io/contacts"),
};
