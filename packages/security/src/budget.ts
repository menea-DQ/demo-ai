// Difese "hard" contro l'abuso dei crediti:
//  1) budget globale giornaliero (max domande/giorno per app)
//  2) limite di sessioni concorrenti (anti flooding)
// Chiavi namespaced per app (`<ns>:budget:<data>`, `<ns>:sessions:active`).
import { redis } from "./redis";
import { sec, k } from "./config";

/* ---- 1) Budget globale giornaliero ---- */
const BUDGET_LUA = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local cur = tonumber(redis.call('GET', key) or '0')
if cur >= max then return {0, cur} end
local v = redis.call('INCR', key)
if v == 1 then redis.call('EXPIRE', key, ttl) end
return {1, v}
`;

function todayKey(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return k(`budget:${d.getUTCFullYear()}-${m}-${day}`);
}
function secondsUntilEndOfDayUTC(): number {
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(60, Math.ceil((end - now.getTime()) / 1000));
}

export interface BudgetResult { allowed: boolean; used: number; limit: number; }

export async function consumeGlobalBudget(): Promise<BudgetResult> {
  const res = (await redis.eval(
    BUDGET_LUA, 1, todayKey(), String(sec.dailyGlobalBudget), String(secondsUntilEndOfDayUTC())
  )) as [number, number];
  return { allowed: res[0] === 1, used: res[1], limit: sec.dailyGlobalBudget };
}

/* ---- 2) Sessioni concorrenti ---- */
const SESSION_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local sid = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - ttl)
local exists = redis.call('ZSCORE', key, sid)
if exists then
  redis.call('ZADD', key, now, sid)
  redis.call('PEXPIRE', key, ttl)
  return {1, redis.call('ZCARD', key)}
end
local count = redis.call('ZCARD', key)
if count >= max then return {0, count} end
redis.call('ZADD', key, now, sid)
redis.call('PEXPIRE', key, ttl)
return {1, redis.call('ZCARD', key)}
`;

export interface SessionSlotResult { allowed: boolean; active: number; limit: number; }

export async function registerOrTouchSession(sid: string): Promise<SessionSlotResult> {
  const now = Date.now();
  const ttlMs = sec.sessionTtlSec * 1000;
  const res = (await redis.eval(
    SESSION_LUA, 1, k("sessions:active"),
    String(now), String(ttlMs), String(sec.maxConcurrentSessions), sid
  )) as [number, number];
  return { allowed: res[0] === 1, active: res[1], limit: sec.maxConcurrentSessions };
}
