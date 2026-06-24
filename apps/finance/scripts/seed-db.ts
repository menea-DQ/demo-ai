// Crea e popola data/finance.db con i dati finanziari di "Vertex Group" (azienda fittizia).
// Dati DETERMINISTICI (PRNG seeded → nessun servizio esterno, ricostruibile a ogni build).
// Eseguito in automatico in predev/prebuild.
//
// Dominio: retail & distribuzione multi-divisione, multi-regione, EUR.
// Storico: 36 mesi (2023-07 → 2026-06). Forecast: 18 mesi (2026-07 → 2027-12), 3 scenari.
//
// Schema documentato per l'AI in apps/finance/SCHEMA.md — TENERE ALLINEATO se cambi le tabelle.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "finance.db");
mkdirSync(join(process.cwd(), "data"), { recursive: true });
// Riparti puliti (il file è in .gitignore).
try { rmSync(DB_PATH); } catch { /* prima esecuzione */ }
try { rmSync(DB_PATH + "-journal"); rmSync(DB_PATH + "-wal"); rmSync(DB_PATH + "-shm"); } catch { /* ok */ }

const db = new DatabaseSync(DB_PATH);

/* ──────────────────────────────────────────────────────────────────────────
 * PRNG deterministico (mulberry32) + helper
 * ────────────────────────────────────────────────────────────────────────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260624);
const rint = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const rfloat = (min: number, max: number) => rnd() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;
/** estrazione pesata: items con peso `w` */
function weighted<T extends { w: number }>(items: T[]): T {
  const tot = items.reduce((s, i) => s + i.w, 0);
  let r = rnd() * tot;
  for (const it of items) { if ((r -= it.w) <= 0) return it; }
  return items[items.length - 1];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Calendario
 * ────────────────────────────────────────────────────────────────────────── */
function monthsBetween(start: string, count: number): string[] {
  const [y0, m0] = start.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y0, m0 - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
const HISTORY = monthsBetween("2023-07", 36);          // 2023-07 → 2026-06
const FORECAST = monthsBetween("2026-07", 18);         // 2026-07 → 2027-12
const monthNum = (m: string) => Number(m.split("-")[1]);
// stagionalità retail: picco Nov/Dic, dip Gen/Ago
const SEASON: Record<number, number> = {
  1: 0.88, 2: 0.9, 3: 0.98, 4: 1.0, 5: 1.03, 6: 1.05,
  7: 0.99, 8: 0.82, 9: 1.04, 10: 1.08, 11: 1.22, 12: 1.3,
};

/* ──────────────────────────────────────────────────────────────────────────
 * Schema
 * ────────────────────────────────────────────────────────────────────────── */
db.exec(`
PRAGMA journal_mode = MEMORY;

CREATE TABLE divisions (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE regions (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, macro_area TEXT NOT NULL, country TEXT NOT NULL
);
CREATE TABLE channels (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE products (
  id INTEGER PRIMARY KEY, sku TEXT NOT NULL, name TEXT NOT NULL,
  division_id INTEGER NOT NULL, category TEXT NOT NULL,
  list_price REAL NOT NULL, unit_cost REAL NOT NULL, launch_month TEXT NOT NULL, active INTEGER NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id)
);
CREATE TABLE customers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, segment TEXT NOT NULL, industry TEXT NOT NULL,
  region_id INTEGER NOT NULL, acquisition_month TEXT NOT NULL,
  status TEXT NOT NULL, churn_month TEXT, credit_rating TEXT NOT NULL,
  FOREIGN KEY (region_id) REFERENCES regions(id)
);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, department TEXT NOT NULL, role TEXT NOT NULL,
  division_id INTEGER, region_id INTEGER NOT NULL, hire_date TEXT NOT NULL, termination_date TEXT,
  monthly_gross_salary REAL NOT NULL, employment_type TEXT NOT NULL, status TEXT NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);
CREATE TABLE sales (
  id INTEGER PRIMARY KEY, month TEXT NOT NULL,
  customer_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
  region_id INTEGER NOT NULL, channel_id INTEGER NOT NULL,
  units INTEGER NOT NULL, gross_revenue REAL NOT NULL, discount REAL NOT NULL,
  net_revenue REAL NOT NULL, cogs REAL NOT NULL, gross_margin REAL NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);
CREATE TABLE costs (
  id INTEGER PRIMARY KEY, month TEXT NOT NULL, division_id INTEGER, region_id INTEGER,
  category TEXT NOT NULL, amount REAL NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);
CREATE TABLE competitors (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, hq_country TEXT NOT NULL,
  primary_division_id INTEGER, is_self INTEGER NOT NULL,
  FOREIGN KEY (primary_division_id) REFERENCES divisions(id)
);
CREATE TABLE competitor_metrics (
  id INTEGER PRIMARY KEY, month TEXT NOT NULL, competitor_id INTEGER NOT NULL,
  market_share_pct REAL NOT NULL, est_revenue REAL NOT NULL, price_index REAL NOT NULL, nps REAL NOT NULL,
  FOREIGN KEY (competitor_id) REFERENCES competitors(id)
);
CREATE TABLE forecasts (
  id INTEGER PRIMARY KEY, month TEXT NOT NULL, scenario TEXT NOT NULL,
  division_id INTEGER, metric TEXT NOT NULL, value REAL NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id)
);
CREATE TABLE forecast_drivers (
  id INTEGER PRIMARY KEY, scenario TEXT NOT NULL, driver TEXT NOT NULL,
  value REAL NOT NULL, unit TEXT NOT NULL, note TEXT NOT NULL
);
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY, month TEXT NOT NULL, division_id INTEGER, metric TEXT NOT NULL, target REAL NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id)
);

CREATE INDEX idx_sales_month   ON sales(month);
CREATE INDEX idx_sales_prod    ON sales(product_id);
CREATE INDEX idx_sales_cust    ON sales(customer_id);
CREATE INDEX idx_sales_region  ON sales(region_id);
CREATE INDEX idx_sales_channel ON sales(channel_id);
CREATE INDEX idx_costs_month   ON costs(month);
CREATE INDEX idx_fc_month      ON forecasts(month);

-- Vista: vendite arricchite con tutte le dimensioni (per group-by comodi)
CREATE VIEW v_sales_enriched AS
SELECT s.id, s.month, s.units, s.gross_revenue, s.discount, s.net_revenue, s.cogs, s.gross_margin,
       d.id AS division_id, d.name AS division, p.category, p.name AS product,
       r.name AS region, r.macro_area, ch.name AS channel, ch.kind AS channel_kind,
       c.name AS customer, c.segment, c.industry
FROM sales s
JOIN products  p  ON p.id  = s.product_id
JOIN divisions d  ON d.id  = p.division_id
JOIN regions   r  ON r.id  = s.region_id
JOIN channels  ch ON ch.id = s.channel_id
JOIN customers c  ON c.id  = s.customer_id;

-- Vista: conto economico mensile consolidato (ricavi, COGS, opex, margini, EBITDA)
CREATE VIEW v_pl_monthly AS
SELECT m.month,
       COALESCE(sa.revenue, 0) AS revenue,
       COALESCE(sa.cogs, 0)    AS cogs,
       COALESCE(sa.revenue, 0) - COALESCE(sa.cogs, 0) AS gross_margin,
       COALESCE(co.opex, 0)    AS opex,
       COALESCE(sa.revenue, 0) - COALESCE(sa.cogs, 0) - COALESCE(co.opex, 0) AS ebitda
FROM (SELECT DISTINCT month FROM sales) m
LEFT JOIN (SELECT month, SUM(net_revenue) AS revenue, SUM(cogs) AS cogs FROM sales GROUP BY month) sa ON sa.month = m.month
LEFT JOIN (SELECT month, SUM(amount) AS opex FROM costs GROUP BY month) co ON co.month = m.month;
`);

/* ──────────────────────────────────────────────────────────────────────────
 * Dimensioni
 * ────────────────────────────────────────────────────────────────────────── */
// `w` = peso sul NUMERO di order-line (calibrato col prezzo medio per ottenere un mix
// ricavi sensato: Elettronica ~30%, Casa ~22%, Moda ~20%, Food ~15%, Sport ~13%).
const DIVISIONS = [
  { id: 1, name: "Elettronica", description: "Elettronica di consumo, informatica, smart home", w: 0.9, growth: 0.013, cogsRate: 0.70 },
  { id: 2, name: "Casa & Arredo", description: "Mobili, arredo, complementi, illuminazione", w: 0.8, growth: 0.010, cogsRate: 0.58 },
  { id: 3, name: "Moda", description: "Abbigliamento, calzature, accessori", w: 3.3, growth: 0.009, cogsRate: 0.52 },
  { id: 4, name: "Food & Beverage", description: "Alimentari, beverage, gastronomia premium", w: 10.0, growth: 0.014, cogsRate: 0.66 },
  { id: 5, name: "Sport & Outdoor", description: "Attrezzatura sportiva, outdoor, fitness", w: 0.9, growth: 0.011, cogsRate: 0.58 },
];
const insDiv = db.prepare("INSERT INTO divisions (id, name, description) VALUES (?,?,?)");
for (const d of DIVISIONS) insDiv.run(d.id, d.name, d.description);

const REGIONS = [
  { id: 1, name: "Nord-Ovest", macro_area: "Italia", country: "IT", w: 1.35 },
  { id: 2, name: "Nord-Est", macro_area: "Italia", country: "IT", w: 1.15 },
  { id: 3, name: "Centro", macro_area: "Italia", country: "IT", w: 1.0 },
  { id: 4, name: "Sud", macro_area: "Italia", country: "IT", w: 0.85 },
  { id: 5, name: "Isole", macro_area: "Italia", country: "IT", w: 0.45 },
  { id: 6, name: "Estero (EU)", macro_area: "Internazionale", country: "EU", w: 0.7 },
];
const insReg = db.prepare("INSERT INTO regions (id, name, macro_area, country) VALUES (?,?,?,?)");
for (const r of REGIONS) insReg.run(r.id, r.name, r.macro_area, r.country);

// wStart/wEnd = peso line-share a inizio/fine storico (drift: e-commerce e marketplace crescono).
// Calibrati con la dimensione media degli ordini (wholesale = ordini grandi) per un mix
// ricavi realistico: Negozi ~37%, E-commerce ~26%, Wholesale ~26%, Marketplace ~11%.
const CHANNELS = [
  { id: 1, name: "Negozi", kind: "B2C", description: "Punti vendita fisici (retail)", wStart: 0.52, wEnd: 0.40 },
  { id: 2, name: "E-commerce", kind: "B2C", description: "Sito proprietario / app", wStart: 0.24, wEnd: 0.40 },
  { id: 3, name: "Wholesale", kind: "B2B", description: "Vendita all'ingrosso a rivenditori", wStart: 0.10, wEnd: 0.07 },
  { id: 4, name: "Marketplace", kind: "B2C", description: "Marketplace terzi (Amazon, eBay, ...)", wStart: 0.10, wEnd: 0.16 },
];
const insCh = db.prepare("INSERT INTO channels (id, name, kind, description) VALUES (?,?,?,?)");
for (const c of CHANNELS) insCh.run(c.id, c.name, c.kind, c.description);

/* ──────────────────────────────────────────────────────────────────────────
 * Prodotti (~16 per divisione)
 * ────────────────────────────────────────────────────────────────────────── */
const CATALOG: Record<number, { categories: string[]; price: [number, number]; words: string[] }> = {
  1: { categories: ["Smartphone", "Notebook", "TV & Audio", "Smart Home", "Accessori"], price: [49, 2200], words: ["Pulse", "Nova", "Vertex", "Aero", "Lumen", "Core", "Flux", "Orbit"] },
  2: { categories: ["Divani", "Cucine", "Illuminazione", "Decor", "Outdoor"], price: [29, 1800], words: ["Milano", "Comfort", "Nordic", "Lumina", "Terra", "Casa", "Vivo", "Soft"] },
  3: { categories: ["Uomo", "Donna", "Calzature", "Accessori", "Kids"], price: [19, 380], words: ["Urban", "Classico", "Active", "Linea", "Stile", "Eco", "Prime", "Trend"] },
  4: { categories: ["Dispensa", "Bevande", "Fresco", "Gastronomia", "Bio"], price: [3, 95], words: ["Selezione", "Bio", "Gusto", "Terra", "Premium", "Natura", "Origine", "Riserva"] },
  5: { categories: ["Fitness", "Outdoor", "Running", "Team Sport", "Abbigliamento"], price: [15, 950], words: ["Trail", "Peak", "Sprint", "Force", "Aero", "Summit", "Pro", "Active"] },
};
interface Product { id: number; division_id: number; category: string; list_price: number; unit_cost: number; }
const products: Product[] = [];
const insProd = db.prepare("INSERT INTO products (id, sku, name, division_id, category, list_price, unit_cost, launch_month, active) VALUES (?,?,?,?,?,?,?,?,?)");
let pid = 0;
for (const div of DIVISIONS) {
  const cat = CATALOG[div.id];
  for (let i = 0; i < 16; i++) {
    pid++;
    const category = pick(cat.categories);
    const list_price = round2(rfloat(cat.price[0], cat.price[1]));
    const unit_cost = round2(list_price * (div.cogsRate + rfloat(-0.06, 0.06)));
    const name = `${pick(cat.words)} ${pick(cat.words)} ${category}`;
    const sku = `${div.name.slice(0, 2).toUpperCase()}-${String(pid).padStart(4, "0")}`;
    const launch = HISTORY[rint(0, 20)];
    const active = rnd() > 0.08 ? 1 : 0;
    insProd.run(pid, sku, name, div.id, category, list_price, unit_cost, launch, active);
    products.push({ id: pid, division_id: div.id, category, list_price, unit_cost });
  }
}
const productsByDiv: Record<number, Product[]> = {};
for (const p of products) (productsByDiv[p.division_id] ??= []).push(p);

/* ──────────────────────────────────────────────────────────────────────────
 * Clienti (B2B nominali + aggregati "Consumatori" per regione)
 * ────────────────────────────────────────────────────────────────────────── */
const SEGMENTS = ["Enterprise", "Mid-Market", "SMB", "Reseller"];
const INDUSTRIES = ["Retail", "Distribuzione", "GDO", "E-commerce", "Hospitality", "Manifattura", "Servizi", "Pubblica Amm."];
const RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B"];
const CO_PREFIX = ["Lombardi", "Ferrari", "Esposito", "Adriatica", "Tirreno", "Alpina", "Mediterranea", "Borealis", "Apex", "Delta", "Vesta", "Aurora", "Helios", "Nimbus", "Aster", "Orione", "Sirio", "Magenta", "Verde", "Po", "Etna", "Garda"];
const CO_CORE = ["Trade", "Group", "Distribuzione", "Retail", "Commerce", "Partners", "Logistica", "Market", "Supply", "Forniture"];
const CO_SUFFIX = ["S.p.A.", "S.r.l.", "& Co.", "Holding", "Italia", "GmbH", "Group"];
interface Customer { id: number; segment: string; region_id: number; status: string; }
const customers: Customer[] = [];
const insCust = db.prepare("INSERT INTO customers (id, name, segment, industry, region_id, acquisition_month, status, churn_month, credit_rating) VALUES (?,?,?,?,?,?,?,?,?)");
let cid = 0;
const ALL_MONTHS = [...HISTORY, ...FORECAST];
// B2B
for (let i = 0; i < 180; i++) {
  cid++;
  const segment = weighted([{ v: "Enterprise", w: 1 }, { v: "Mid-Market", w: 2 }, { v: "SMB", w: 3.5 }, { v: "Reseller", w: 2 }]).v;
  const region = weighted(REGIONS.map((r) => ({ v: r.id, w: r.w })));
  const name = `${pick(CO_PREFIX)} ${pick(CO_CORE)} ${pick(CO_SUFFIX)}`;
  // acquisizione: alcuni storici (pre-2023), altri durante la finestra
  const acquisition = rnd() < 0.5 ? `${rint(2017, 2023)}-${String(rint(1, 12)).padStart(2, "0")}` : HISTORY[rint(0, 30)];
  const churned = rnd() < 0.12;
  const churn_month = churned ? HISTORY[rint(18, 35)] : null;
  insCust.run(cid, name, segment, pick(INDUSTRIES), region.v, acquisition, churned ? "churned" : "active", churn_month, pick(RATINGS));
  customers.push({ id: cid, segment, region_id: region.v, status: churned ? "churned" : "active" });
}
// Consumatori aggregati per regione (per i canali B2C)
const consumerByRegion: Record<number, number> = {};
for (const r of REGIONS) {
  cid++;
  insCust.run(cid, `Consumatori ${r.name}`, "Consumer", "Retail", r.id, "2017-01", "active", null, "n/d");
  customers.push({ id: cid, segment: "Consumer", region_id: r.id, status: "active" });
  consumerByRegion[r.id] = cid;
}
const b2bByRegion: Record<number, Customer[]> = {};
for (const c of customers) if (c.segment !== "Consumer") (b2bByRegion[c.region_id] ??= []).push(c);

/* ──────────────────────────────────────────────────────────────────────────
 * Dipendenti (~320)
 * ────────────────────────────────────────────────────────────────────────── */
const FIRST = ["Marco", "Giulia", "Luca", "Sara", "Andrea", "Chiara", "Matteo", "Francesca", "Alessandro", "Elena", "Davide", "Martina", "Stefano", "Valentina", "Simone", "Federica", "Riccardo", "Alice", "Paolo", "Beatrice", "Antonio", "Laura", "Giuseppe", "Anna"];
const LAST = ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Fontana", "Santoro", "Mariani"];
const DEPTS: { dept: string; roles: string[]; base: number; hasDiv: boolean; w: number }[] = [
  { dept: "Sales", roles: ["Account Executive", "Sales Manager", "Key Account", "Sales Rep"], base: 2800, hasDiv: true, w: 4 },
  { dept: "Operations", roles: ["Operations Specialist", "Store Manager", "Operations Manager"], base: 2600, hasDiv: true, w: 4 },
  { dept: "Logistics", roles: ["Warehouse Operator", "Logistics Coordinator", "Supply Chain Manager"], base: 2300, hasDiv: false, w: 2.5 },
  { dept: "Marketing", roles: ["Marketing Specialist", "Brand Manager", "CRM Manager"], base: 2900, hasDiv: true, w: 2 },
  { dept: "IT", roles: ["Software Engineer", "Data Analyst", "IT Manager", "DevOps"], base: 3400, hasDiv: false, w: 1.6 },
  { dept: "Finance", roles: ["Accountant", "Financial Analyst", "Controller", "CFO Office"], base: 3200, hasDiv: false, w: 1.2 },
  { dept: "HR", roles: ["HR Specialist", "Recruiter", "HR Manager"], base: 2700, hasDiv: false, w: 1 },
  { dept: "Customer Service", roles: ["Customer Care", "Support Lead"], base: 2200, hasDiv: false, w: 2 },
  { dept: "R&D", roles: ["Product Designer", "R&D Specialist"], base: 3300, hasDiv: true, w: 1 },
  { dept: "Management", roles: ["Director", "VP", "Executive"], base: 6500, hasDiv: false, w: 0.6 },
];
const EMP_TYPES = [{ v: "Full-time", w: 8 }, { v: "Part-time", w: 1.5 }, { v: "Contract", w: 1 }];
const insEmp = db.prepare("INSERT INTO employees (id, full_name, department, role, division_id, region_id, hire_date, termination_date, monthly_gross_salary, employment_type, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
for (let i = 1; i <= 320; i++) {
  const d = weighted(DEPTS);
  const role = pick(d.roles);
  const seniorityMul = role.match(/Manager|Director|VP|Executive|Lead|Controller|CFO/) ? rfloat(1.4, 2.2) : rfloat(0.9, 1.35);
  const salary = round2(d.base * seniorityMul);
  const region = weighted(REGIONS.map((r) => ({ v: r.id, w: r.w })));
  const hireYear = rint(2015, 2026);
  const hire = `${hireYear}-${String(rint(1, 12)).padStart(2, "0")}-${String(rint(1, 28)).padStart(2, "0")}`;
  const left = rnd() < 0.1;
  const term = left ? `${rint(2024, 2026)}-${String(rint(1, 12)).padStart(2, "0")}-15` : null;
  insEmp.run(i, `${pick(FIRST)} ${pick(LAST)}`, d.dept, role, d.hasDiv ? pick(DIVISIONS).id : null, region.v, hire, term, salary, weighted(EMP_TYPES).v, left ? "left" : "active");
}

/* ──────────────────────────────────────────────────────────────────────────
 * Vendite (~1800 order-line/mese → ~65k righe) con trend + stagionalità
 * ────────────────────────────────────────────────────────────────────────── */
const insSale = db.prepare(
  "INSERT INTO sales (month, customer_id, product_id, region_id, channel_id, units, gross_revenue, discount, net_revenue, cogs, gross_margin) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
);
db.exec("BEGIN");
let saleCount = 0;
HISTORY.forEach((month, t) => {
  const season = SEASON[monthNum(month)];
  // share canali con drift temporale (e-commerce/marketplace crescono nel tempo)
  const prog = t / (HISTORY.length - 1);
  const chWeights = CHANNELS.map((c) => ({ id: c.id, kind: c.kind, w: (c.wStart + (c.wEnd - c.wStart) * prog) }));
  const lines = Math.round(1800 * season * (0.92 + 0.16 * prog) * rfloat(0.96, 1.04));
  for (let i = 0; i < lines; i++) {
    const div = weighted(DIVISIONS.map((d) => ({ v: d, w: d.w })));
    const trend = Math.pow(1 + div.v.growth, t);
    const region = weighted(REGIONS.map((r) => ({ v: r.id, w: r.w })));
    const ch = weighted(chWeights.map((c) => ({ v: c, w: c.w })));
    const product = pick(productsByDiv[div.v.id]);
    // cliente coerente col canale
    let customer_id: number;
    if (ch.v.kind === "B2C") customer_id = consumerByRegion[region.v];
    else { const pool = b2bByRegion[region.v] ?? customers; customer_id = pick(pool).id; }
    // quantità: ordini wholesale più grandi (ma non troppo, per un mix canali realistico)
    const units = ch.v.kind === "B2B" ? rint(4, 30) : rint(1, 8);
    const gross = round2(product.list_price * units * trend * rfloat(0.97, 1.03));
    const discPct = ch.v.kind === "B2B" ? rfloat(0.05, 0.22) : (rnd() < 0.35 ? rfloat(0.05, 0.35) : 0);
    const discount = round2(gross * discPct);
    const net = round2(gross - discount);
    const cogs = round2(product.unit_cost * units * trend);
    insSale.run(month, customer_id, product.id, region.v, ch.v.id, units, gross, discount, net, cogs, round2(net - cogs));
    saleCount++;
  }
});
db.exec("COMMIT");

/* ──────────────────────────────────────────────────────────────────────────
 * Costi operativi (opex) per mese / divisione / categoria
 * (i COGS NON sono qui: stanno in sales.cogs → P&L = ricavi - COGS - opex)
 * ────────────────────────────────────────────────────────────────────────── */
const OPEX: { category: string; rateOfRev: number; perDiv: boolean }[] = [
  { category: "Personale", rateOfRev: 0.090, perDiv: true },
  { category: "Marketing", rateOfRev: 0.035, perDiv: true },
  { category: "Logistica", rateOfRev: 0.030, perDiv: true },
  { category: "Affitti", rateOfRev: 0.020, perDiv: true },
  { category: "IT & Software", rateOfRev: 0.012, perDiv: false },
  { category: "G&A", rateOfRev: 0.015, perDiv: false },
  { category: "Ammortamenti", rateOfRev: 0.010, perDiv: false },
];
const insCost = db.prepare("INSERT INTO costs (month, division_id, region_id, category, amount) VALUES (?,?,?,?,?)");
// ricavi mese×divisione per dimensionare gli opex in modo coerente
const revByMonthDiv = db.prepare(`
  SELECT s.month AS month, p.division_id AS div, SUM(s.net_revenue) AS rev
  FROM sales s JOIN products p ON p.id = s.product_id GROUP BY s.month, p.division_id
`).all() as { month: string; div: number; rev: number }[];
const revMap = new Map<string, number>();
for (const r of revByMonthDiv) revMap.set(`${r.month}|${r.div}`, r.rev);
const revByMonth = new Map<string, number>();
for (const r of revByMonthDiv) revByMonth.set(r.month, (revByMonth.get(r.month) ?? 0) + r.rev);

db.exec("BEGIN");
for (const month of HISTORY) {
  for (const o of OPEX) {
    if (o.perDiv) {
      for (const div of DIVISIONS) {
        const rev = revMap.get(`${month}|${div.id}`) ?? 0;
        const amount = round2(rev * o.rateOfRev * rfloat(0.92, 1.08));
        if (amount > 0) insCost.run(month, div.id, null, o.category, amount);
      }
    } else {
      const rev = revByMonth.get(month) ?? 0;
      const amount = round2(rev * o.rateOfRev * rfloat(0.95, 1.05));
      if (amount > 0) insCost.run(month, null, null, o.category, amount);
    }
  }
}
db.exec("COMMIT");

/* ──────────────────────────────────────────────────────────────────────────
 * Competitor + metriche di mercato (Vertex Group = is_self)
 * ────────────────────────────────────────────────────────────────────────── */
const COMPETITORS = [
  { id: 1, name: "Vertex Group", hq: "IT", div: null, self: 1, share: 18.5, price: 1.0, nps: 42 },
  { id: 2, name: "MegaMart Retail", hq: "DE", div: 1, self: 0, share: 24.0, price: 0.92, nps: 35 },
  { id: 3, name: "CasaViva", hq: "IT", div: 2, self: 0, share: 14.0, price: 1.05, nps: 38 },
  { id: 4, name: "ModaPrima", hq: "FR", div: 3, self: 0, share: 12.5, price: 1.12, nps: 40 },
  { id: 5, name: "SportPlanet", hq: "ES", div: 5, self: 0, share: 9.0, price: 0.97, nps: 33 },
];
const insComp = db.prepare("INSERT INTO competitors (id, name, hq_country, primary_division_id, is_self) VALUES (?,?,?,?,?)");
for (const c of COMPETITORS) insComp.run(c.id, c.name, c.hq, c.div, c.self);
const insCM = db.prepare("INSERT INTO competitor_metrics (month, competitor_id, market_share_pct, est_revenue, price_index, nps) VALUES (?,?,?,?,?,?)");
db.exec("BEGIN");
HISTORY.forEach((month, t) => {
  const prog = t / (HISTORY.length - 1);
  for (const c of COMPETITORS) {
    // Vertex guadagna quota nel tempo, MegaMart la perde leggermente
    const drift = c.self ? prog * 2.6 : (c.id === 2 ? -prog * 1.8 : prog * rfloat(-0.4, 0.6));
    const share = round2(c.share + drift + rfloat(-0.4, 0.4));
    const totRev = (revByMonth.get(month) ?? 0);
    const est = round2((totRev / (c.self ? 1 : 1)) * (share / (c.self ? 18.5 : 18.5)) * (c.self ? 1 : rfloat(0.85, 1.25)));
    const nps = round2(c.nps + (c.self ? prog * 6 : prog * rfloat(-2, 3)) + rfloat(-1.5, 1.5));
    insCM.run(month, c.id, share, est, round2(c.price + rfloat(-0.03, 0.03)), nps);
  }
});
db.exec("COMMIT");

/* ──────────────────────────────────────────────────────────────────────────
 * Forecast (18 mesi, 3 scenari) + driver + budget
 * Baseline = proiezione del trend recente; optimistic/pessimistic = scostamenti crescenti.
 * ────────────────────────────────────────────────────────────────────────── */
// medie ultime finestre per divisione (revenue, cogs, opex)
const recentRev = db.prepare(`
  SELECT p.division_id AS div, s.month AS month, SUM(s.net_revenue) AS rev, SUM(s.cogs) AS cogs
  FROM sales s JOIN products p ON p.id = s.product_id GROUP BY p.division_id, s.month
`).all() as { div: number; month: string; rev: number; cogs: number }[];
const opexByMonthDiv = db.prepare(`SELECT month, division_id AS div, SUM(amount) AS opex FROM costs WHERE division_id IS NOT NULL GROUP BY month, division_id`).all() as { month: string; div: number; opex: number }[];
const opexShared = db.prepare(`SELECT month, SUM(amount) AS opex FROM costs WHERE division_id IS NULL GROUP BY month`).all() as { month: string; opex: number }[];
const sharedOpexAvg = opexShared.slice(-6).reduce((s, r) => s + r.opex, 0) / Math.max(1, opexShared.slice(-6).length);

const last6 = HISTORY.slice(-6);
function avgRecent(div: number, key: "rev" | "cogs") {
  const rows = recentRev.filter((r) => r.div === div && last6.includes(r.month));
  return rows.reduce((s, r) => s + r[key], 0) / Math.max(1, rows.length);
}
function avgOpex(div: number) {
  const rows = opexByMonthDiv.filter((r) => r.div === div && last6.includes(r.month));
  return rows.reduce((s, r) => s + r.opex, 0) / Math.max(1, rows.length);
}

const SCENARIOS = [
  { name: "baseline", growth: 0.011, costPressure: 1.0 },
  { name: "optimistic", growth: 0.021, costPressure: 0.97 },
  { name: "pessimistic", growth: -0.002, costPressure: 1.06 },
];
const insFc = db.prepare("INSERT INTO forecasts (month, scenario, division_id, metric, value) VALUES (?,?,?,?,?)");
db.exec("BEGIN");
for (const sc of SCENARIOS) {
  FORECAST.forEach((month, k) => {
    const season = SEASON[monthNum(month)];
    let totRev = 0, totCost = 0, totMargin = 0;
    for (const div of DIVISIONS) {
      const baseRev = avgRecent(div.id, "rev");
      const baseCogs = avgRecent(div.id, "cogs");
      const baseOpex = avgOpex(div.id);
      const g = Math.pow(1 + sc.growth, k + 1);
      const revenue = round2(baseRev * g * season);
      const costs = round2((baseCogs * g + baseOpex * sc.costPressure) * (season * 0.6 + 0.4));
      const margin = round2(revenue - costs);
      insFc.run(month, sc.name, div.id, "revenue", revenue);
      insFc.run(month, sc.name, div.id, "costs", costs);
      insFc.run(month, sc.name, div.id, "margin", margin);
      totRev += revenue; totCost += costs; totMargin += margin;
    }
    // costi condivisi a livello ALL
    const shared = round2(sharedOpexAvg * sc.costPressure * Math.pow(1 + sc.growth, k + 1));
    insFc.run(month, sc.name, null, "revenue", round2(totRev));
    insFc.run(month, sc.name, null, "costs", round2(totCost + shared));
    insFc.run(month, sc.name, null, "margin", round2(totMargin - shared));
  });
}
db.exec("COMMIT");

const insDrv = db.prepare("INSERT INTO forecast_drivers (scenario, driver, value, unit, note) VALUES (?,?,?,?,?)");
const DRIVERS = [
  ["baseline", "Crescita ricavi MoM", 1.1, "%", "Continuazione del trend storico recente"],
  ["baseline", "Pressione costi", 0.0, "%", "Costi in linea con l'inflazione attesa"],
  ["baseline", "Churn clienti", 1.2, "%/mese", "Tasso di abbandono stabile"],
  ["optimistic", "Crescita ricavi MoM", 2.1, "%", "Espansione canale e-commerce + nuovi mercati EU"],
  ["optimistic", "Pressione costi", -3.0, "%", "Efficienze logistiche e rinegoziazione fornitori"],
  ["optimistic", "Churn clienti", 0.7, "%/mese", "Programma fidelizzazione efficace"],
  ["pessimistic", "Crescita ricavi MoM", -0.2, "%", "Rallentamento consumi e pressione competitiva"],
  ["pessimistic", "Pressione costi", 6.0, "%", "Aumento materie prime ed energia"],
  ["pessimistic", "Churn clienti", 2.1, "%/mese", "Perdita quota verso MegaMart Retail"],
];
for (const d of DRIVERS) insDrv.run(...(d as [string, string, number, string, string]));

// Budget FY2026 (obiettivi mensili revenue per divisione, ~+8% sul run-rate)
const insBud = db.prepare("INSERT INTO budgets (month, division_id, metric, target) VALUES (?,?,?,?)");
db.exec("BEGIN");
for (const month of monthsBetween("2026-01", 12)) {
  const season = SEASON[monthNum(month)];
  for (const div of DIVISIONS) {
    const base = avgRecent(div.id, "rev");
    insBud.run(month, div.id, "revenue", round2(base * 1.08 * season));
  }
}
db.exec("COMMIT");

/* ──────────────────────────────────────────────────────────────────────────
 * Report
 * ────────────────────────────────────────────────────────────────────────── */
const counts = {
  sales: saleCount,
  products: products.length,
  customers: customers.length,
  employees: 320,
  costs: (db.prepare("SELECT COUNT(*) n FROM costs").get() as { n: number }).n,
  forecasts: (db.prepare("SELECT COUNT(*) n FROM forecasts").get() as { n: number }).n,
  competitor_metrics: (db.prepare("SELECT COUNT(*) n FROM competitor_metrics").get() as { n: number }).n,
};
console.log("✓ finance.db (Vertex Group) creato:", JSON.stringify(counts));
db.close();
