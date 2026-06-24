// Accesso in SOLA LETTURA a data/finance.db (SQLite via node:sqlite).
// - Query tipizzate per i pannelli del cruscotto (filtri parametrizzati, colonne in whitelist).
// - Esecutore SQL read-only validato per l'assistente AI (solo SELECT/WITH, single statement).
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) _db = new DatabaseSync(join(process.cwd(), "data", "finance.db"), { readOnly: true });
  return _db;
}
type Row = Record<string, unknown>;
const all = (sql: string, params: unknown[] = []): Row[] => db().prepare(sql).all(...(params as never[])) as Row[];
const one = (sql: string, params: unknown[] = []): Row | undefined => db().prepare(sql).get(...(params as never[])) as Row | undefined;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/* ──────────────────────────────────────────────────────────────────────────
 * Filtri condivisi del cruscotto
 * ────────────────────────────────────────────────────────────────────────── */
export interface Filters {
  monthFrom?: string;
  monthTo?: string;
  division?: string;
  region?: string;
  channel?: string;
  segment?: string;
  category?: string;
  macroArea?: string;
}
// colonne testuali filtrabili su v_sales_enriched → mappa whitelist (no SQL arbitrario)
const FILTER_COLS: Record<string, string> = {
  division: "division",
  region: "region",
  channel: "channel",
  segment: "segment",
  category: "category",
  macroArea: "macro_area",
};
function whereSales(f: Filters): { sql: string; params: unknown[] } {
  const cl: string[] = [];
  const params: unknown[] = [];
  if (f.monthFrom) { cl.push("month >= ?"); params.push(f.monthFrom); }
  if (f.monthTo) { cl.push("month <= ?"); params.push(f.monthTo); }
  for (const [key, col] of Object.entries(FILTER_COLS)) {
    const v = (f as Record<string, string | undefined>)[key];
    if (v) { cl.push(`${col} = ?`); params.push(v); }
  }
  return { sql: cl.length ? "WHERE " + cl.join(" AND ") : "", params };
}

export interface FilterOptions {
  divisions: string[]; regions: string[]; channels: string[]; segments: string[]; categories: string[]; macroAreas: string[];
  months: string[]; minMonth: string; maxMonth: string;
}
export function getFilterOptions(): FilterOptions {
  const col = (t: string, c: string) => all(`SELECT DISTINCT ${c} v FROM ${t} ORDER BY ${c}`).map((r) => String(r.v));
  const months = all("SELECT DISTINCT month v FROM sales ORDER BY month").map((r) => String(r.v));
  return {
    divisions: col("divisions", "name"),
    regions: col("regions", "name"),
    channels: col("channels", "name"),
    segments: all("SELECT DISTINCT segment v FROM customers ORDER BY segment").map((r) => String(r.v)),
    categories: all("SELECT DISTINCT category v FROM products ORDER BY category").map((r) => String(r.v)),
    macroAreas: col("regions", "macro_area"),
    months, minMonth: months[0], maxMonth: months[months.length - 1],
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * KPI di sintesi
 * ────────────────────────────────────────────────────────────────────────── */
export interface Kpis {
  revenue: number; cogs: number; grossMargin: number; grossMarginPct: number;
  opex: number; ebitda: number; ebitdaPct: number; units: number; orders: number;
  revenueYoY: number | null; activeCustomers: number; headcount: number; marketSharePct: number;
}
export function getKpis(f: Filters): Kpis {
  const w = whereSales(f);
  const s = one(
    `SELECT SUM(net_revenue) rev, SUM(cogs) cogs, SUM(gross_margin) gm, SUM(units) units, COUNT(*) orders
     FROM v_sales_enriched ${w.sql}`, w.params
  )!;
  const revenue = num(s.rev), cogs = num(s.cogs), grossMargin = num(s.gm);
  // opex: filtrabile solo per divisione/mese (i costi non hanno regione/canale/segmento)
  const opex = num(opexTotal(f).total);
  const ebitda = grossMargin - opex;
  // YoY: confronta i 12 mesi più recenti del range con i 12 precedenti
  const revenueYoY = computeYoY(f);
  const activeCustomers = num(one("SELECT COUNT(*) n FROM customers WHERE status='active'")!.n);
  const headcount = num(one("SELECT COUNT(*) n FROM employees WHERE status='active'")!.n);
  const ms = one("SELECT market_share_pct s FROM competitor_metrics WHERE competitor_id=(SELECT id FROM competitors WHERE is_self=1) ORDER BY month DESC LIMIT 1");
  return {
    revenue, cogs, grossMargin, grossMarginPct: revenue ? (grossMargin / revenue) * 100 : 0,
    opex, ebitda, ebitdaPct: revenue ? (ebitda / revenue) * 100 : 0,
    units: num(s.units), orders: num(s.orders), revenueYoY,
    activeCustomers, headcount, marketSharePct: ms ? num(ms.s) : 0,
  };
}
function opexTotal(f: Filters): { total: number } {
  const cl: string[] = []; const params: unknown[] = [];
  if (f.monthFrom) { cl.push("c.month >= ?"); params.push(f.monthFrom); }
  if (f.monthTo) { cl.push("c.month <= ?"); params.push(f.monthTo); }
  if (f.division) { cl.push("c.division_id = (SELECT id FROM divisions WHERE name = ?)"); params.push(f.division); }
  const sql = `SELECT SUM(amount) total FROM costs c ${cl.length ? "WHERE " + cl.join(" AND ") : ""}`;
  return { total: num(one(sql, params)?.total) };
}
function computeYoY(f: Filters): number | null {
  // ricavi totali per mese (rispettando i filtri non temporali), poi confronta blocchi da 12
  const nf: Filters = { ...f, monthFrom: undefined, monthTo: undefined };
  const w = whereSales(nf);
  const rows = all(`SELECT month, SUM(net_revenue) rev FROM v_sales_enriched ${w.sql} GROUP BY month ORDER BY month`, w.params);
  if (rows.length < 24) return null;
  const last12 = rows.slice(-12).reduce((a, r) => a + num(r.rev), 0);
  const prev12 = rows.slice(-24, -12).reduce((a, r) => a + num(r.rev), 0);
  return prev12 ? ((last12 - prev12) / prev12) * 100 : null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Conto economico mensile (con filtri sulle vendite)
 * ────────────────────────────────────────────────────────────────────────── */
export interface PLPoint { month: string; revenue: number; cogs: number; grossMargin: number; opex: number; ebitda: number; }
export function getPLTrend(f: Filters): PLPoint[] {
  const w = whereSales(f);
  const sales = all(
    `SELECT month, SUM(net_revenue) rev, SUM(cogs) cogs, SUM(gross_margin) gm
     FROM v_sales_enriched ${w.sql} GROUP BY month ORDER BY month`, w.params
  );
  // opex per mese (filtrato per divisione se presente)
  const cl: string[] = []; const cp: unknown[] = [];
  if (f.division) { cl.push("division_id = (SELECT id FROM divisions WHERE name = ?)"); cp.push(f.division); }
  const opexRows = all(`SELECT month, SUM(amount) opex FROM costs ${cl.length ? "WHERE " + cl.join(" AND ") : ""} GROUP BY month`, cp);
  const opexMap = new Map(opexRows.map((r) => [String(r.month), num(r.opex)]));
  return sales.map((r) => {
    const revenue = num(r.rev), cogs = num(r.cogs), grossMargin = num(r.gm);
    const opex = opexMap.get(String(r.month)) ?? 0;
    return { month: String(r.month), revenue, cogs, grossMargin, opex, ebitda: grossMargin - opex };
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Breakdown per dimensione
 * ────────────────────────────────────────────────────────────────────────── */
export interface BreakdownRow { key: string; revenue: number; grossMargin: number; marginPct: number; units: number; }
export function getBreakdown(dimension: string, f: Filters): BreakdownRow[] {
  const col = FILTER_COLS[dimension] ?? (dimension === "macro_area" ? "macro_area" : "division");
  const w = whereSales(f);
  const rows = all(
    `SELECT ${col} k, SUM(net_revenue) rev, SUM(gross_margin) gm, SUM(units) units
     FROM v_sales_enriched ${w.sql} GROUP BY ${col} ORDER BY rev DESC`, w.params
  );
  return rows.map((r) => {
    const revenue = num(r.rev), gm = num(r.gm);
    return { key: String(r.k), revenue, grossMargin: gm, marginPct: revenue ? (gm / revenue) * 100 : 0, units: num(r.units) };
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Classifiche
 * ────────────────────────────────────────────────────────────────────────── */
export function getTopProducts(f: Filters, limit = 10): BreakdownRow[] {
  const w = whereSales(f);
  const rows = all(
    `SELECT product k, SUM(net_revenue) rev, SUM(gross_margin) gm, SUM(units) units
     FROM v_sales_enriched ${w.sql} GROUP BY product ORDER BY rev DESC LIMIT ?`, [...w.params, limit]
  );
  return rows.map((r) => { const revenue = num(r.rev), gm = num(r.gm); return { key: String(r.k), revenue, grossMargin: gm, marginPct: revenue ? (gm / revenue) * 100 : 0, units: num(r.units) }; });
}
export function getTopCustomers(f: Filters, limit = 10): (BreakdownRow & { segment: string })[] {
  const w = whereSales({ ...f });
  const extra = w.sql ? `${w.sql} AND segment != 'Consumer'` : "WHERE segment != 'Consumer'";
  const rows = all(
    `SELECT customer k, segment, SUM(net_revenue) rev, SUM(gross_margin) gm, SUM(units) units
     FROM v_sales_enriched ${extra} GROUP BY customer, segment ORDER BY rev DESC LIMIT ?`, [...w.params, limit]
  );
  return rows.map((r) => { const revenue = num(r.rev), gm = num(r.gm); return { key: String(r.k), segment: String(r.segment), revenue, grossMargin: gm, marginPct: revenue ? (gm / revenue) * 100 : 0, units: num(r.units) }; });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Costi operativi per categoria
 * ────────────────────────────────────────────────────────────────────────── */
export function getCostBreakdown(f: Filters): { category: string; amount: number }[] {
  const cl: string[] = []; const params: unknown[] = [];
  if (f.monthFrom) { cl.push("c.month >= ?"); params.push(f.monthFrom); }
  if (f.monthTo) { cl.push("c.month <= ?"); params.push(f.monthTo); }
  if (f.division) { cl.push("c.division_id = (SELECT id FROM divisions WHERE name = ?)"); params.push(f.division); }
  const rows = all(`SELECT category, SUM(amount) amount FROM costs c ${cl.length ? "WHERE " + cl.join(" AND ") : ""} GROUP BY category ORDER BY amount DESC`, params);
  return rows.map((r) => ({ category: String(r.category), amount: num(r.amount) }));
}

/* ──────────────────────────────────────────────────────────────────────────
 * Budget vs Actual (FY2026) — confronto a livello di mese × divisione.
 * Usa SOLO periodo + divisione dei filtri (il budget è definito per divisione),
 * così il confronto resta apples-to-apples.
 * ────────────────────────────────────────────────────────────────────────── */
export interface BudgetPoint { month: string; actual: number; target: number; }
export function getBudgetVsActual(f: Filters): BudgetPoint[] {
  // i budget esistono solo per il FY2026 → interseca il range con 2026
  const from = (f.monthFrom && f.monthFrom > "2026-01" ? f.monthFrom : "2026-01");
  const to = (f.monthTo && f.monthTo < "2026-12" ? f.monthTo : "2026-12");
  if (from > to) return [];
  const divActual = f.division ? "AND division = ?" : "";
  const divBudget = f.division ? "AND division_id = (SELECT id FROM divisions WHERE name = ?)" : "";
  const aParams = f.division ? [from, to, f.division] : [from, to];
  const bParams = f.division ? [from, to, f.division] : [from, to];
  const actuals = all(`SELECT month, SUM(net_revenue) a FROM v_sales_enriched WHERE month BETWEEN ? AND ? ${divActual} GROUP BY month`, aParams);
  const targets = all(`SELECT month, SUM(target) t FROM budgets WHERE month BETWEEN ? AND ? ${divBudget} GROUP BY month`, bParams);
  const am = new Map(actuals.map((r) => [String(r.month), num(r.a)]));
  return targets
    .map((r) => ({ month: String(r.month), actual: am.get(String(r.month)) ?? 0, target: num(r.t) }))
    .sort((x, y) => x.month.localeCompare(y.month));
}

/* ──────────────────────────────────────────────────────────────────────────
 * Forecast
 * ────────────────────────────────────────────────────────────────────────── */
export interface ForecastSeries {
  history: { month: string; revenue: number }[];
  scenarios: Record<string, { month: string; revenue: number; costs: number; margin: number }[]>;
  drivers: { scenario: string; driver: string; value: number; unit: string; note: string }[];
}
export function getForecast(division?: string): ForecastSeries {
  const divId = division ? num(one("SELECT id FROM divisions WHERE name = ?", [division])?.id) : null;
  // storico ricavi (ultimi 12 mesi) filtrato per divisione se presente
  const hw = division ? "WHERE division = ?" : "";
  const history = all(
    `SELECT month, SUM(net_revenue) rev FROM v_sales_enriched ${hw} GROUP BY month ORDER BY month DESC LIMIT 12`,
    division ? [division] : []
  ).reverse().map((r) => ({ month: String(r.month), revenue: num(r.rev) }));
  const divClause = divId ? "division_id = ?" : "division_id IS NULL";
  const scenarios: ForecastSeries["scenarios"] = {};
  for (const sc of ["baseline", "optimistic", "pessimistic"]) {
    const rows = all(
      `SELECT month,
              MAX(CASE WHEN metric='revenue' THEN value END) revenue,
              MAX(CASE WHEN metric='costs'   THEN value END) costs,
              MAX(CASE WHEN metric='margin'  THEN value END) margin
       FROM forecasts WHERE scenario = ? AND ${divClause} GROUP BY month ORDER BY month`,
      divId ? [sc, divId] : [sc]
    );
    scenarios[sc] = rows.map((r) => ({ month: String(r.month), revenue: num(r.revenue), costs: num(r.costs), margin: num(r.margin) }));
  }
  const drivers = all("SELECT scenario, driver, value, unit, note FROM forecast_drivers ORDER BY scenario, id").map((r) => ({
    scenario: String(r.scenario), driver: String(r.driver), value: num(r.value), unit: String(r.unit), note: String(r.note),
  }));
  return { history, scenarios, drivers };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Competitor
 * ────────────────────────────────────────────────────────────────────────── */
export function getCompetitors(): {
  latest: { name: string; isSelf: boolean; marketShare: number; nps: number; priceIndex: number }[];
  shareTrend: { month: string; [name: string]: number | string }[];
} {
  const maxMonth = String(one("SELECT MAX(month) m FROM competitor_metrics")!.m);
  const latest = all(
    `SELECT c.name, c.is_self self, m.market_share_pct s, m.nps, m.price_index pi
     FROM competitor_metrics m JOIN competitors c ON c.id=m.competitor_id
     WHERE m.month = ? ORDER BY m.market_share_pct DESC`, [maxMonth]
  ).map((r) => ({ name: String(r.name), isSelf: !!num(r.self), marketShare: num(r.s), nps: num(r.nps), priceIndex: num(r.pi) }));
  const rows = all(
    `SELECT m.month, c.name, m.market_share_pct s
     FROM competitor_metrics m JOIN competitors c ON c.id=m.competitor_id ORDER BY m.month`
  );
  const byMonth = new Map<string, Record<string, number | string>>();
  for (const r of rows) {
    const mo = String(r.month);
    if (!byMonth.has(mo)) byMonth.set(mo, { month: mo });
    byMonth.get(mo)![String(r.name)] = num(r.s);
  }
  return { latest, shareTrend: [...byMonth.values()] as { month: string; [k: string]: number | string }[] };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Persone (HR)
 * ────────────────────────────────────────────────────────────────────────── */
export function getEmployeeStats(): {
  total: number; payroll: number; avgSalary: number;
  byDepartment: { department: string; headcount: number; avgSalary: number }[];
  byType: { type: string; headcount: number }[];
} {
  const t = one("SELECT COUNT(*) n, SUM(monthly_gross_salary) p, AVG(monthly_gross_salary) a FROM employees WHERE status='active'")!;
  const byDepartment = all(
    "SELECT department, COUNT(*) hc, AVG(monthly_gross_salary) avg FROM employees WHERE status='active' GROUP BY department ORDER BY hc DESC"
  ).map((r) => ({ department: String(r.department), headcount: num(r.hc), avgSalary: num(r.avg) }));
  const byType = all("SELECT employment_type t, COUNT(*) hc FROM employees WHERE status='active' GROUP BY employment_type ORDER BY hc DESC")
    .map((r) => ({ type: String(r.t), headcount: num(r.hc) }));
  return { total: num(t.n), payroll: num(t.p), avgSalary: num(t.a), byDepartment, byType };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Esecutore SQL read-only validato (per l'AI / text-to-SQL)
 * ────────────────────────────────────────────────────────────────────────── */
const SQL_FORBIDDEN = /\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex|trigger|begin|commit|rollback|grant|revoke)\b/i;
export interface SqlResult { ok: boolean; error?: string; columns: string[]; rows: Row[]; rowCount: number; truncated: boolean; sql: string; }
const MAX_SQL_ROWS = 200;

export function runSafeSql(raw: string): SqlResult {
  let sql = (raw ?? "").trim().replace(/;+\s*$/, "");
  const fail = (error: string): SqlResult => ({ ok: false, error, columns: [], rows: [], rowCount: 0, truncated: false, sql });
  if (!sql) return fail("Query vuota.");
  if (sql.includes(";")) return fail("È consentito un solo statement (niente ';').");
  if (!/^(select|with)\b/i.test(sql)) return fail("Sono consentite solo query SELECT/WITH (sola lettura).");
  if (SQL_FORBIDDEN.test(sql)) return fail("La query contiene parole chiave non consentite (sola lettura).");
  // imponi un LIMIT se assente
  if (!/\blimit\b/i.test(sql)) sql = `${sql} LIMIT ${MAX_SQL_ROWS}`;
  try {
    const rows = all(sql);
    const truncated = rows.length > MAX_SQL_ROWS;
    const out = rows.slice(0, MAX_SQL_ROWS);
    return { ok: true, columns: out.length ? Object.keys(out[0]) : [], rows: out, rowCount: out.length, truncated, sql };
  } catch (e) {
    return fail(`Errore SQL: ${(e as Error).message}`);
  }
}
