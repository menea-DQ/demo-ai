// @donq/security — logica di sicurezza condivisa tra le demo (namespaced per app).
export { sec, k, turnstileEnabled, isProd, insecureSessionSecret } from "./config";
export { redis } from "./redis";
export { createSessionToken, issueTokenForSid, verifySessionToken } from "./session";
export { consumeRateLimit, peekRateLimit, type RateLimitResult } from "./rateLimit";
export { consumeGlobalBudget, registerOrTouchSession, type BudgetResult, type SessionSlotResult } from "./budget";
export { verifyTurnstile } from "./turnstile";
export { getClientIp, sessionCookieHeader, readSessionCookie, jsonResponse } from "./http";
