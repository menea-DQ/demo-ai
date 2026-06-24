// Client LLM verso OpenRouter (API OpenAI-compatibile). Usato a runtime per l'assistente.
import OpenAI from "openai";
import { env } from "./env";

let _client: OpenAI | null = null;

export function llm(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.openrouterApiKey,
      baseURL: env.openrouterBaseUrl,
      fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
      maxRetries: 2,
      timeout: 60_000,
      defaultHeaders: {
        // NB: header HTTP solo ASCII (un em-dash qui causava "Connection error" con undici).
        "HTTP-Referer": env.appUrl,
        "X-Title": "Vertex Finance - Donq",
      },
    });
  }
  return _client;
}
