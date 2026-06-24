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

export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }
  const ip = getClientIp(req);

  let body: { turnstileToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* opzionale */
  }

  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human) {
    return jsonResponse({ ok: false, error: "turnstile", message: "Verifica anti-bot non superata." }, 403);
  }

  const existingSid = verifySessionToken(readSessionCookie(req));
  const sid = existingSid ?? createSessionToken().sid;
  const token = issueTokenForSid(sid);
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

  const rl = await peekRateLimit(ip);
  return jsonResponse(
    {
      ok: true,
      remaining: rl.remaining,
      limits: { rateLimitMax: sec.rateLimitMax, rateLimitWindowSec: sec.rateLimitWindowSec },
      ctaUrl: env.contactCtaUrl,
    },
    200,
    { "set-cookie": sessionCookieHeader(token) }
  );
}
