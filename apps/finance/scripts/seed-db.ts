// Crea e popola data/finance.db con dati finanziari di esempio (deterministici).
// Eseguito in automatico in predev/prebuild. Nessun servizio esterno.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "finance.db");
mkdirSync(join(process.cwd(), "data"), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  DROP TABLE IF EXISTS transactions;
  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY,
    month TEXT NOT NULL,        -- 'YYYY-MM'
    category TEXT NOT NULL,
    type TEXT NOT NULL,         -- 'ricavo' | 'costo'
    amount REAL NOT NULL        -- EUR
  );
`);

// Categorie: una di ricavo, le altre di costo (PMI manifatturiera "Aurora").
const CATEGORIES: { name: string; type: "ricavo" | "costo"; base: number; growth: number }[] = [
  { name: "Vendite", type: "ricavo", base: 120000, growth: 3500 },
  { name: "Acquisti materie prime", type: "costo", base: 48000, growth: 1200 },
  { name: "Stipendi", type: "costo", base: 52000, growth: 300 },
  { name: "Marketing", type: "costo", base: 8000, growth: 250 },
  { name: "Logistica", type: "costo", base: 9000, growth: 180 },
];

const insert = db.prepare("INSERT INTO transactions (month, category, type, amount) VALUES (?, ?, ?, ?)");
for (let m = 0; m < 12; m++) {
  const month = `2025-${String(m + 1).padStart(2, "0")}`;
  for (const c of CATEGORIES) {
    // stagionalità deterministica (niente random): leggera oscillazione mensile
    const seasonal = 1 + 0.06 * Math.sin((m / 12) * 2 * Math.PI);
    const amount = Math.round((c.base + c.growth * m) * seasonal);
    insert.run(month, c.name, c.type, amount);
  }
}

const n = db.prepare("SELECT COUNT(*) AS n FROM transactions").get() as { n: number };
console.log(`✓ finance.db: ${n.n} transazioni (2025, ${CATEGORIES.length} categorie).`);
db.close();
