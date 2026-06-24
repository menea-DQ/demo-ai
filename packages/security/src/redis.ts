// Client Redis singleton (solo lato server).
import Redis from "ioredis";
import { sec } from "./config";

declare global {
  // eslint-disable-next-line no-var
  var __donqRedis: Redis | undefined;
}

function create(): Redis {
  const client = new Redis(sec.redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true, // connessione alla prima query (evita connessioni in fase di build)
  });
  client.on("error", (err) => console.error("[redis] errore di connessione:", err.message));
  return client;
}

export const redis: Redis = global.__donqRedis ?? create();
if (process.env.NODE_ENV !== "production") global.__donqRedis = redis;
