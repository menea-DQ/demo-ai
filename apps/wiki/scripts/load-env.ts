// Carica .env.local / .env per gli script eseguiti con tsx (Next li carica da solo a runtime).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export function loadEnv() {
  const cwd = process.cwd();
  loadFile(join(cwd, ".env.local"));
  loadFile(join(cwd, ".env"));
}

// Auto-esecuzione: importare questo modulo PER PRIMO negli script popola process.env
// prima che lib/env venga valutato.
loadEnv();
