import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  sec, insecureSessionSecret, getClientIp, jsonResponse, readSessionCookie, sessionCookieHeader,
  verifySessionToken, issueTokenForSid, registerOrTouchSession, consumeGlobalBudget, consumeRateLimit,
} from "@donq/security";
import { runAgent, type ChatTurn } from "@/lib/finance-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Assistente AI sui dati finanziari. Stessa cascata di sicurezza della wiki, limiti SEGREGATI
 * (APP_NAMESPACE=finance → chiavi `finance:*`). Risposta NDJSON in streaming.
 */
export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }
  const ip = getClientIp(req);

  const sid = verifySessionToken(readSessionCookie(req));
  if (!sid) return jsonResponse({ ok: false, error: "session", message: "Sessione non valida o scaduta. Ricarica la pagina." }, 401);

  let body: { question?: string; history?: ChatTurn[] } = {};
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "bad_request", message: "Richiesta non valida." }, 400); }
  const question = (body.question ?? "").toString().trim();
  if (!question) return jsonResponse({ ok: false, error: "empty", message: "Scrivi una domanda." }, 400);
  if (question.length > env.maxQuestionLen) {
    return jsonResponse({ ok: false, error: "too_long", message: `Domanda troppo lunga (max ${env.maxQuestionLen} caratteri).` }, 400);
  }
  // cronologia conversazione (per i follow-up); validata e limitata
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t): t is ChatTurn => !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .slice(-8)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }))
    : [];

  const slot = await registerOrTouchSession(sid);
  if (!slot.allowed) {
    return jsonResponse({ ok: false, error: "concurrency", message: "Troppe sessioni attive sulla demo.", ctaUrl: env.contactCtaUrl }, 429);
  }

  const rl = await consumeRateLimit(ip);
  if (!rl.allowed) {
    return jsonResponse(
      { ok: false, error: "rate_limit", message: `Hai raggiunto il limite di ${rl.limit} domande in ${Math.round(sec.rateLimitWindowSec / 60)} minuti.`, resetAt: rl.resetAt, ctaUrl: env.contactCtaUrl },
      429
    );
  }

  const budget = await consumeGlobalBudget();
  if (!budget.allowed) {
    return jsonResponse({ ok: false, error: "budget", message: "La demo ha raggiunto il numero massimo di domande per oggi. Prenota una presentazione dedicata.", ctaUrl: env.contactCtaUrl }, 429);
  }

  if (!env.openrouterApiKey) {
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato (manca OPENROUTER_API_KEY)." }, 500);
  }

  const encoder = new TextEncoder();
  const rs = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      try {
        await runAgent(question, history, (e) => send(e));
        send({ type: "done", remaining: rl.remaining });
      } catch (err) {
        console.error("[chat] errore agente:", err);
        send({ type: "error", message: "Errore nel generare la risposta. Riprova." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(rs, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-ratelimit-remaining": String(rl.remaining),
      "set-cookie": sessionCookieHeader(issueTokenForSid(sid)),
    },
  });
}
