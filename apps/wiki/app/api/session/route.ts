import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  sec,
  insecureSessionSecret,
  getClientIp,
  jsonResponse,
  sessionCookieHeader,
  readSessionCookie,
  verifyTurnstile,
  createSessionToken,
  issueTokenForSid,
  verifySessionToken,
  registerOrTouchSession,
  peekRateLimit,
} from "@donq/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crea/riusa una sessione demo.
 * Difese: verifica Turnstile (anti-bot) + limite sessioni concorrenti (anti-flooding).
 */
export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    console.error("[config] SESSION_SECRET non sicuro in produzione.");
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }
  const ip = getClientIp(req);

  let body: { turnstileToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body opzionale */
  }

  // 1) Anti-bot: blocca PRIMA di assegnare risorse.
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human) {
    return jsonResponse(
      { ok: false, error: "turnstile", message: "Verifica anti-bot non superata. Ricarica la pagina e riprova." },
      403
    );
  }

  // 2) Riusa la sessione esistente (se il cookie è valido): il refresh non azzera i limiti
  //    e non crea sessioni fantasma.
  const existingSid = verifySessionToken(readSessionCookie(req));
  const sid = existingSid ?? createSessionToken().sid;
  const token = issueTokenForSid(sid);
  const slot = await registerOrTouchSession(sid);
  if (!slot.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: "concurrency",
        message: "Troppe sessioni attive in questo momento sulla demo. Riprova tra qualche minuto o prenota una presentazione.",
        ctaUrl: env.contactCtaUrl,
      },
      429
    );
  }

  // Conteggio reale rimasto per questo IP (senza consumare).
  const rl = await peekRateLimit(ip);

  return jsonResponse(
    {
      ok: true,
      remaining: rl.remaining,
      resetAt: rl.resetAt,
      limits: { rateLimitMax: sec.rateLimitMax, rateLimitWindowSec: sec.rateLimitWindowSec },
      ctaUrl: env.contactCtaUrl,
    },
    200,
    { "set-cookie": sessionCookieHeader(token) }
  );
}
