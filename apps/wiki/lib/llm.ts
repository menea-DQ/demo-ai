// Client LLM verso OpenRouter (API OpenAI-compatibile). Usato a runtime per le risposte chat.
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
        // NB: header HTTP solo ASCII (un em-dash qui causava "Connection error" con undici).
        // X-Title è passato per-richiesta (per azienda) in wiki-answer.ts.
        "HTTP-Referer": env.appUrl,
      },
    });
  }
  return _client;
}
