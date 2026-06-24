// Verifica server-side del token Cloudflare Turnstile.
// Se le chiavi non sono configurate la verifica è disattivata (utile in sviluppo locale).

import { env, turnstileEnabled } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!turnstileEnabled) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[turnstile] disattivato (chiavi mancanti): verifica saltata in sviluppo.");
      return true;
    }
    // In produzione, se mal configurato, è più sicuro bloccare.
    console.error("[turnstile] chiavi mancanti in produzione: richiesta rifiutata.");
    return false;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams();
    body.set("secret", env.turnstileSecret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const r = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await r.json()) as { success: boolean };
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] errore di verifica:", e);
    return false;
  }
}
