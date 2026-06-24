// Configurazione SPECIFICA dell'app finance (la sicurezza è in @donq/security).
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
  // --- OpenRouter (assistente AI, runtime) ---
  openrouterApiKey: str("OPENROUTER_API_KEY"),
  openrouterBaseUrl: str("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  llmModel: str("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
  maxOutputTokens: num("LLM_MAX_TOKENS", 1100),
  maxToolSteps: num("LLM_MAX_TOOL_STEPS", 5),

  // --- Input ---
  maxQuestionLen: num("MAX_QUESTION_LEN", 600),

  // --- App / CTA ---
  appUrl: str("NEXT_PUBLIC_APP_URL", "http://localhost:3002"),
  contactCtaUrl: str("NEXT_PUBLIC_CONTACT_URL", "https://donq.io/contacts"),
};
