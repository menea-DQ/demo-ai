// Client LLM unico verso OpenRouter (API OpenAI-compatibile).
// Usato sia dalla pipeline di build del wiki sia dalle risposte runtime.
import OpenAI from "openai";
import { env } from "./env";

let _client: OpenAI | null = null;

export function llm(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.openrouterApiKey,
      baseURL: env.openrouterBaseUrl,
      // Forza il fetch globale di Node (l'SDK in alcuni ambienti usa un transport che fallisce).
      fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
      maxRetries: 3,
      timeout: 60_000,
      defaultHeaders: {
        "HTTP-Referer": env.appUrl,
        "X-Title": "Aurora Wiki - Donq",
      },
    });
  }
  return _client;
}

/** Chiamata "structured": forza output JSON e lo parsa (con fallback robusto). */
export async function llmJson<T>(opts: {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const res = await llm().chat.completions.create({
    model: opts.model ?? env.buildModel,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "";
  return parseJsonLoose<T>(text);
}

/** Estrae un oggetto/array JSON anche se circondato da testo o ```json fences. */
export function parseJsonLoose<T>(text: string): T {
  const cleaned = text.replace(/```json\s*|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const endObj = cleaned.lastIndexOf("}");
    const endArr = cleaned.lastIndexOf("]");
    const end = Math.max(endObj, endArr);
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("Risposta LLM non in formato JSON valido");
  }
}
