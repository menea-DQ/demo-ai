// Helper HTTP per le route handler.
import { sec } from "./config";

/**
 * Estrae l'IP del client dagli header.
 * IMPORTANTE: si fida di x-forwarded-for, quindi DEVE girare dietro un reverse proxy
 * che SOVRASCRIVE quell'header (vedi DEPLOY.md). Il budget globale resta il limite hard.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

/** Header del cookie di sessione (httpOnly, SameSite=Strict, Secure in prod), namespaced. */
export function sessionCookieHeader(token: string): string {
  const parts = [
    `${sec.sessionCookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${sec.sessionTtlSec}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function readSessionCookie(req: Request): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [name, ...v] = part.trim().split("=");
    if (name === sec.sessionCookieName) return v.join("=");
  }
  return undefined;
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extraHeaders },
  });
}
