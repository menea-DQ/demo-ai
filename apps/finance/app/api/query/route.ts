import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  sec,
  insecureSessionSecret,
  getClientIp,
  jsonResponse,
  readSessionCookie,
  sessionCookieHeader,
  verifySessionToken,
  issueTokenForSid,
  registerOrTouchSession,
  consumeGlobalBudget,
  consumeRateLimit,
} from "@donq/security";
import { listCategories, totalsByCategory, monthlyTrend } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Interroga i dati finanziari (SQLite). Stessa cascata di sicurezza della demo wiki,
 * ma con limiti SEGREGATI (APP_NAMESPACE=finance → chiavi `finance:*` su Redis).
 */
export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }

  const ip = getClientIp(req);
  const sid = verifySessionToken(readSessionCookie(req));
  if (!sid) return jsonResponse({ ok: false, error: "session", message: "Sessione non valida o scaduta." }, 401);

  let body: { category?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* opzionale */
  }

  // input: solo una categoria da WHITELIST (nessun SQL arbitrario)
  const categories = listCategories();
  let category: string | undefined;
  if (body.category) {
    if (!categories.includes(body.category)) {
      return jsonResponse({ ok: false, error: "bad_input", message: "Categoria non valida." }, 400);
    }
    category = body.category;
  }

  // heartbeat sessione + concorrenza
  const slot = await registerOrTouchSession(sid);
  if (!slot.allowed) {
    return jsonResponse(
      { ok: false, error: "concurrency", message: "Troppe sessioni attive.", ctaUrl: env.contactCtaUrl },
      429
    );
  }

  // rate limit per IP (segregato: finance:rl:<ip>)
  const rl = await consumeRateLimit(ip);
  if (!rl.allowed) {
    return jsonResponse(
      {
        ok: false,
        error: "rate_limit",
        message: `Hai raggiunto il limite di ${rl.limit} interrogazioni in ${Math.round(sec.rateLimitWindowSec / 60)} minuti.`,
        resetAt: rl.resetAt,
        ctaUrl: env.contactCtaUrl,
      },
      429
    );
  }

  // budget globale giornaliero (segregato: finance:budget:<data>)
  const budget = await consumeGlobalBudget();
  if (!budget.allowed) {
    return jsonResponse(
      { ok: false, error: "budget", message: "Limite giornaliero della demo raggiunto.", ctaUrl: env.contactCtaUrl },
      429
    );
  }

  const data = {
    ok: true,
    categories,
    totals: totalsByCategory(category),
    trend: monthlyTrend(),
    remaining: rl.remaining,
  };
  return jsonResponse(data, 200, { "set-cookie": sessionCookieHeader(issueTokenForSid(sid)) });
}
