import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  insecureSessionSecret, jsonResponse, readSessionCookie, sessionCookieHeader,
  verifySessionToken, issueTokenForSid, registerOrTouchSession,
} from "@donq/security";
import {
  getFilterOptions, getKpis, getPLTrend, getBreakdown, getTopProducts, getTopCustomers,
  getCostBreakdown, getBudgetVsActual, getForecast, getCompetitors, getEmployeeStats, type Filters,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Navigazione dati (SENZA AI). Restituisce il bundle completo del cruscotto per i filtri dati.
 * Non consuma il budget/rate-limit dell'AI: l'esplorazione dei dati è libera (richiede solo
 * una sessione valida + rispetto del limite di sessioni concorrenti).
 */
export async function POST(req: NextRequest) {
  if (insecureSessionSecret) {
    return jsonResponse({ ok: false, error: "config", message: "Servizio non configurato correttamente." }, 500);
  }
  const sid = verifySessionToken(readSessionCookie(req));
  if (!sid) return jsonResponse({ ok: false, error: "session", message: "Sessione non valida o scaduta." }, 401);

  const slot = await registerOrTouchSession(sid);
  if (!slot.allowed) {
    return jsonResponse(
      { ok: false, error: "concurrency", message: "Troppe sessioni attive sulla demo.", ctaUrl: env.contactCtaUrl },
      429
    );
  }

  let body: { filters?: Filters } = {};
  try { body = await req.json(); } catch { /* default */ }
  const f = sanitize(body.filters ?? {});

  try {
    const data = {
      ok: true,
      options: getFilterOptions(),
      filters: f,
      kpis: getKpis(f),
      pl: getPLTrend(f),
      breakdown: {
        division: getBreakdown("division", f),
        region: getBreakdown("region", f),
        channel: getBreakdown("channel", f),
        segment: getBreakdown("segment", f),
        category: getBreakdown("category", f).slice(0, 12),
      },
      topProducts: getTopProducts(f, 10),
      topCustomers: getTopCustomers(f, 10),
      costs: getCostBreakdown(f),
      budget: getBudgetVsActual(f),
      forecast: getForecast(f.division),
      competitors: getCompetitors(),
      employees: getEmployeeStats(),
    };
    return jsonResponse(data, 200, { "set-cookie": sessionCookieHeader(issueTokenForSid(sid)) });
  } catch (e) {
    console.error("[data] errore:", e);
    return jsonResponse({ ok: false, error: "server", message: "Errore nel recupero dei dati." }, 500);
  }
}

const MONTH = /^\d{4}-\d{2}$/;
function sanitize(f: Filters): Filters {
  const out: Filters = {};
  if (f.monthFrom && MONTH.test(f.monthFrom)) out.monthFrom = f.monthFrom;
  if (f.monthTo && MONTH.test(f.monthTo)) out.monthTo = f.monthTo;
  for (const k of ["division", "region", "channel", "segment", "category", "macroArea"] as const) {
    const v = f[k];
    if (typeof v === "string" && v.length <= 40) out[k] = v;
  }
  return out;
}
