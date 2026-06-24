import { NextRequest } from "next/server";
import { env, insecureSessionSecret } from "@/lib/env";
import { getClientIp, jsonResponse, readSessionCookie, sessionCookieHeader } from "@/lib/http";
import { verifySessionToken, issueTokenForSid } from "@/lib/session";
import { registerOrTouchSession, consumeGlobalBudget } from "@/lib/budget";
import { consumeRateLimit } from "@/lib/rateLimit";
import { retrieve } from "@/lib/retrieval";
import { streamAnswer, SENTINEL } from "@/lib/wiki-answer";
import { parseCitations, enrichCitations, relatedFromCitations } from "@/lib/citations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }
  const ip = getClientIp(req);

  // 1) Sessione valida e firmata
  const sid = verifySessionToken(readSessionCookie(req));
  if (!sid) {
    return jsonResponse(
      { ok: false, error: "session", message: "Sessione non valida o scaduta. Ricarica la pagina." },
      401
    );
  }

  // 2) Input
  let body: { question?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "bad_request", message: "Richiesta non valida." }, 400);
  }
  const question = (body.question ?? "").toString().trim();
  if (!question) return jsonResponse({ ok: false, error: "empty", message: "Scrivi una domanda." }, 400);
  if (question.length > env.maxQuestionLen) {
    return jsonResponse(
      { ok: false, error: "too_long", message: `Domanda troppo lunga (max ${env.maxQuestionLen} caratteri).` },
      400
    );
  }

  // 3) Heartbeat sessione + limite sessioni concorrenti
  const slot = await registerOrTouchSession(sid);
  if (!slot.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: "concurrency",
        message: "Troppe sessioni attive sulla demo. Riprova tra poco o prenota una presentazione.",
        ctaUrl: env.contactCtaUrl,
      },
      429
    );
  }

  // 4) Rate limit per utente, agganciato all'IP (robusto a refresh e cancellazione cookie)
  const rl = await consumeRateLimit(ip);
  if (!rl.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: "rate_limit",
        message: `Hai raggiunto il limite di ${rl.limit} domande in ${Math.round(env.rateLimitWindowSec / 60)} minuti.`,
        resetAt: rl.resetAt,
        ctaUrl: env.contactCtaUrl,
      },
      429
    );
  }

  // 5) Budget globale giornaliero
  const budget = await consumeGlobalBudget();
  if (!budget.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: "budget",
        message: "La demo ha raggiunto il numero massimo di domande per oggi. Prenota una presentazione dedicata.",
        ctaUrl: env.contactCtaUrl,
      },
      429
    );
  }

  // 6) Configurazione
  if (!env.openrouterApiKey) {
    return jsonResponse(
      { ok: false, error: "config", message: "Servizio non configurato (manca OPENROUTER_API_KEY)." },
      500
    );
  }

  // 7) Retrieval sulle pagine wiki
  const pages = retrieve(question, 4, 2);
  const encoder = new TextEncoder();

  if (pages.length === 0) {
    const rs = new ReadableStream({
      start(controller) {
        const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
        send({
          type: "token",
          text: "Non ho trovato informazioni pertinenti nel knowledge base per questa domanda. Prova a riformularla, oppure contatta il team Donq.",
        });
        send({ type: "citations", citations: [], related: [] });
        send({ type: "done", remaining: rl.remaining });
        controller.close();
      },
    });
    return ndjson(rs, rl.remaining, sessionCookieHeader(issueTokenForSid(sid)));
  }

  // 8) Streaming risposta (OpenRouter) con parsing del marcatore citazioni
  const rs = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));

      send({
        type: "meta",
        retrieved: pages.map((r) => ({
          pageId: r.page.id,
          title: r.page.title,
          category: r.page.category,
          type: r.page.type,
          viaGraph: r.viaGraph,
        })),
      });

      let buffer = "";
      let proseClosed = false;
      let jsonBuf = "";
      const keep = SENTINEL.length - 1;

      try {
        const upstream = await streamAnswer(question, pages);
        for await (const chunk of upstream) {
          const d = chunk.choices[0]?.delta?.content;
          if (!d) continue;
          if (proseClosed) {
            jsonBuf += d;
            continue;
          }
          buffer += d;
          const idx = buffer.indexOf(SENTINEL);
          if (idx >= 0) {
            const prose = buffer.slice(0, idx);
            if (prose) send({ type: "token", text: prose });
            jsonBuf = buffer.slice(idx + SENTINEL.length);
            proseClosed = true;
          } else if (buffer.length > keep) {
            const emit = buffer.slice(0, buffer.length - keep);
            send({ type: "token", text: emit });
            buffer = buffer.slice(buffer.length - keep);
          }
        }

        if (!proseClosed) {
          if (buffer) send({ type: "token", text: buffer });
          send({ type: "citations", citations: [], related: [] });
        } else {
          const citations = enrichCitations(parseCitations(jsonBuf));
          const related = relatedFromCitations(citations);
          send({ type: "citations", citations, related });
        }
        send({ type: "done", remaining: rl.remaining });
      } catch (err) {
        console.error("[chat] errore upstream:", err);
        send({ type: "error", error: "upstream", message: "Errore nel generare la risposta. Riprova." });
      } finally {
        controller.close();
      }
    },
  });

  return ndjson(rs, rl.remaining);
}

function ndjson(rs: ReadableStream, remaining: number, setCookie?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store",
    "x-ratelimit-remaining": String(remaining),
  };
  if (setCookie) headers["set-cookie"] = setCookie;
  return new Response(rs, { headers });
}
