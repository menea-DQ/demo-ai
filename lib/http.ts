// Helper HTTP per le route handler.
import { env } from "./env";

/**
 * Estrae l'IP del client dagli header.
 * IMPORTANTE: si fida di x-forwarded-for, quindi DEVE girare dietro un reverse proxy
 * che SOVRASCRIVE quell'header (es. nginx). Esposto direttamente, l'header è falsificabile
 * e il rate limit per-IP aggirabile; il budget globale giornaliero resta comunque il
 * limite "hard" contro il consumo di crediti.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

/** Header per il cookie di sessione (httpOnly, sameSite strict). */
export function sessionCookieHeader(token: string): string {
  const parts = [
    `${env.sessionCookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${env.sessionTtlSec}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function readSessionCookie(req: Request): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === env.sessionCookieName) return v.join("=");
  }
  return undefined;
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extraHeaders },
  });
}
