// Formattazione numeri/valute + palette grafici (tema dark "terminal").

const nf0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

export const eur = (n: number) => `€${nf0.format(Math.round(n))}`;

/** Valuta compatta: €1,2 mln / €340 mila */
export function eurC(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `€${nf1.format(n / 1_000_000)} mln`;
  if (a >= 1_000) return `€${nf0.format(n / 1_000)} mila`;
  return `€${nf0.format(n)}`;
}
export function numC(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${nf1.format(n / 1_000_000)}M`;
  if (a >= 1_000) return `${nf1.format(n / 1_000)}k`;
  return nf0.format(n);
}
export const pct = (n: number, d = 1) => `${(d === 0 ? nf0 : nf1).format(n)}%`;
export const signedPct = (n: number) => `${n >= 0 ? "+" : ""}${nf1.format(n)}%`;

/** 'YYYY-MM' → 'mmm aa' (es. 'giu 26') */
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export function monthLabel(m: string): string {
  const [y, mm] = m.split("-");
  return `${MESI[Number(mm) - 1]} ${y.slice(2)}`;
}

/* ── Palette ────────────────────────────────────────────────────────────── */
export const C = {
  cyan: "#22d3ee",
  blue: "#60a5fa",
  violet: "#a78bfa",
  emerald: "#34d399",
  rose: "#fb7185",
  amber: "#fbbf24",
  pink: "#f472b6",
  slate: "#94a3b8",
};
export const SERIES = [C.cyan, C.violet, C.emerald, C.amber, C.rose, C.blue, C.pink, C.slate];

export const SCENARIO_COLORS: Record<string, string> = {
  baseline: C.cyan,
  optimistic: C.emerald,
  pessimistic: C.rose,
};
