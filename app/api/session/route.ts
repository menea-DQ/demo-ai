import { NextRequest } from "next/server";
import { env, insecureSessionSecret } from "@/lib/env";
import { getClientIp, jsonResponse, sessionCookieHeader } from "@/lib/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { createSessionToken, issueTokenForSid, verifySessionToken } from "@/lib/session";
import { readSessionCookie } from "@/lib/http";
import { registerOrTouchSession } from "@/lib/budget";
import { peekRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crea una sessione demo.
 * Difese: verifica Turnstile (anti-bot) + limite sessioni concorrenti (anti-flooding).
 */
export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    console.error("[config] SESSION_SECRET non sicuro in produzione: imposta un valore casuale di almeno 16 caratteri.");
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }
  const ip = getClientIp(req);

  let body: { turnstileToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body opzionale */
  }

  // 1) Anti-bot: blocca PRIMA di assegnare risorse o consumare crediti.
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human) {
    return jsonResponse(
      { ok: false, error: "turnstile", message: "Verifica anti-bot non superata. Ricarica la pagina e riprova." },
      403
    );
  }

  // 2) Riusa la sessione esistente (se il cookie è ancora valido) così il refresh
  //    NON azzera limiti e non crea sessioni fantasma; altrimenti creane una nuova.
  const existingSid = verifySessionToken(readSessionCookie(req));
  const sid = existingSid ?? createSessionToken().sid;
  const token = issueTokenForSid(sid); // rinnova la scadenza
  const slot = await registerOrTouchSession(sid);
  if (!slot.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: "concurrency",
        message:
          "Troppe sessioni attive in questo momento sulla demo. Riprova tra qualche minuto o prenota una presentazione dedicata.",
        ctaUrl: env.contactCtaUrl,
      },
      429
    );
  }

  // Conteggio reale rimasto per questo IP (senza consumare), così dopo il refresh
  // la UI mostra il valore corretto invece di tornare al massimo.
  const rl = await peekRateLimit(ip);

  return jsonResponse(
    {
      ok: true,
      remaining: rl.remaining,
      resetAt: rl.resetAt,
      limits: {
        rateLimitMax: env.rateLimitMax,
        rateLimitWindowSec: env.rateLimitWindowSec,
      },
      ctaUrl: env.contactCtaUrl,
    },
    200,
    { "set-cookie": sessionCookieHeader(token) }
  );
}
