// Gestione sessione firmata (cookie httpOnly) con HMAC-SHA256.
// Il cookie non contiene segreti: solo un session-id firmato per impedirne la falsificazione.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "./env";

interface SessionPayload {
  sid: string;
  iat: number; // epoch seconds
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", env.sessionSecret).update(data).digest("base64url");
}

/** Costruisce un token firmato per un dato session-id (con iat corrente). */
export function issueTokenForSid(sid: string): string {
  const payload: SessionPayload = { sid, iat: Math.floor(Date.now() / 1000) };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

/** Crea un nuovo session-id e il relativo token firmato da mettere nel cookie. */
export function createSessionToken(): { sid: string; token: string } {
  const sid = randomUUID();
  return { sid, token: issueTokenForSid(sid) };
}

/** Verifica firma e scadenza del token. Ritorna il session-id o null. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.sid || typeof payload.iat !== "number") return null;
    const ageSec = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSec > env.sessionTtlSec) return null; // scaduta
    return payload.sid;
  } catch {
    return null;
  }
}
