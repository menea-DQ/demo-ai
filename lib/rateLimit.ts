// Rate limit "sliding window" atomico via Redis sorted set.
// L'identità è l'IP del client (vedi route chat): così il limite persiste a refresh e
// non si azzera cancellando i cookie. Richiede che il reverse proxy imposti x-forwarded-for.

import { randomUUID } from "node:crypto";
import { redis } from "./redis";
import { env } from "./env";

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= max then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset = now + window
  if oldest[2] then reset = tonumber(oldest[2]) + window end
  return {0, count, reset}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, count + 1, now + window}
`;

export interface RateLimitResult {
  allowed: boolean;
  /** richieste rimanenti nella finestra */
  remaining: number;
  /** timestamp (ms) in cui la finestra si libera */
  resetAt: number;
  limit: number;
}

/**
 * Consuma una richiesta per l'identità data.
 * Quando `allowed` è false la richiesta NON viene conteggiata.
 */
export async function consumeRateLimit(identity: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = env.rateLimitWindowSec * 1000;
  const max = env.rateLimitMax;
  const key = `rl:${identity}`;

  const res = (await redis.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    String(now),
    String(windowMs),
    String(max),
    `${now}-${randomUUID()}`
  )) as [number, number, number];

  const [allowed, count, reset] = res;
  return {
    allowed: allowed === 1,
    remaining: Math.max(0, max - count),
    resetAt: reset,
    limit: max,
  };
}

const PEEK_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
local reset = now + window
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
if oldest[2] then reset = tonumber(oldest[2]) + window end
return {count, reset}
`;

/** Legge lo stato del rate limit per l'identità SENZA consumare una richiesta. */
export async function peekRateLimit(identity: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = env.rateLimitWindowSec * 1000;
  const max = env.rateLimitMax;
  const res = (await redis.eval(PEEK_LUA, 1, `rl:${identity}`, String(now), String(windowMs))) as [number, number];
  const [count, reset] = res;
  return { allowed: count < max, remaining: Math.max(0, max - count), resetAt: reset, limit: max };
}
