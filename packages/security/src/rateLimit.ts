// Rate limit "sliding window" atomico via Redis sorted set.
// Identità = IP del client (vedi route). Chiave namespaced: `<ns>:rl:<ip>`.
// Richiede che il reverse proxy imposti x-forwarded-for (vedi DEPLOY.md).
import { randomUUID } from "node:crypto";
import { redis } from "./redis";
import { sec, k } from "./config";

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

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export async function consumeRateLimit(identity: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = sec.rateLimitWindowSec * 1000;
  const max = sec.rateLimitMax;
  const res = (await redis.eval(
    SLIDING_WINDOW_LUA, 1, k(`rl:${identity}`),
    String(now), String(windowMs), String(max), `${now}-${randomUUID()}`
  )) as [number, number, number];
  const [allowed, count, reset] = res;
  return { allowed: allowed === 1, remaining: Math.max(0, max - count), resetAt: reset, limit: max };
}

/** Legge lo stato del rate limit SENZA consumare una richiesta. */
export async function peekRateLimit(identity: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = sec.rateLimitWindowSec * 1000;
  const max = sec.rateLimitMax;
  const res = (await redis.eval(PEEK_LUA, 1, k(`rl:${identity}`), String(now), String(windowMs))) as [number, number];
  const [count, reset] = res;
  return { allowed: count < max, remaining: Math.max(0, max - count), resetAt: reset, limit: max };
}
