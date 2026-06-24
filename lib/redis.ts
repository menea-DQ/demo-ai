// Client Redis singleton (solo lato server).
import Redis from "ioredis";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __auroraRedis: Redis | undefined;
}

function create(): Redis {
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true, // connessione alla prima query (evita connessioni in fase di build)
  });
  client.on("error", (err) => {
    console.error("[redis] errore di connessione:", err.message);
  });
  return client;
}

// Riusa la connessione tra hot-reload in sviluppo.
export const redis: Redis = global.__auroraRedis ?? create();
if (!isProdGlobalSet()) global.__auroraRedis = redis;

function isProdGlobalSet(): boolean {
  return process.env.NODE_ENV === "production";
}
