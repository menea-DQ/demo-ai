// Accesso in sola lettura al database finanziario (SQLite via node:sqlite).
// Tutte le query sono PARAMETRIZZATE (niente SQL arbitrario dall'utente → no SQL injection).
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) _db = new DatabaseSync(join(process.cwd(), "data", "finance.db"), { readOnly: true });
  return _db;
}

export interface CategoryTotal {
  category: string;
  type: string;
  total: number;
}
export interface MonthlyPoint {
  month: string;
  ricavi: number;
  costi: number;
  margine: number;
}

export function listCategories(): string[] {
  const rows = db().prepare("SELECT DISTINCT category FROM transactions ORDER BY category").all() as unknown as {
    category: string;
  }[];
  return rows.map((r) => r.category);
}

/** Totali per categoria, opzionalmente filtrati per categoria (parametrizzato). */
export function totalsByCategory(category?: string): CategoryTotal[] {
  if (category) {
    return db()
      .prepare(
        "SELECT category, type, ROUND(SUM(amount)) AS total FROM transactions WHERE category = ? GROUP BY category, type ORDER BY total DESC"
      )
      .all(category) as unknown as CategoryTotal[];
  }
  return db()
    .prepare(
      "SELECT category, type, ROUND(SUM(amount)) AS total FROM transactions GROUP BY category, type ORDER BY total DESC"
    )
    .all() as unknown as CategoryTotal[];
}

/** Andamento mensile: ricavi, costi e margine. */
export function monthlyTrend(): MonthlyPoint[] {
  const rows = db()
    .prepare(
      `SELECT month,
              ROUND(SUM(CASE WHEN type='ricavo' THEN amount ELSE 0 END)) AS ricavi,
              ROUND(SUM(CASE WHEN type='costo'  THEN amount ELSE 0 END)) AS costi
       FROM transactions GROUP BY month ORDER BY month`
    )
    .all() as unknown as { month: string; ricavi: number; costi: number }[];
  return rows.map((r) => ({ ...r, margine: r.ricavi - r.costi }));
}
