// Tipi del payload /api/data (lato client — niente import da node:sqlite).
export interface Filters {
  monthFrom?: string; monthTo?: string;
  division?: string; region?: string; channel?: string; segment?: string; category?: string; macroArea?: string;
}
export interface FilterOptions {
  divisions: string[]; regions: string[]; channels: string[]; segments: string[]; categories: string[]; macroAreas: string[];
  months: string[]; minMonth: string; maxMonth: string;
}
export interface BudgetPoint { month: string; actual: number; target: number; }
export interface Kpis {
  revenue: number; cogs: number; grossMargin: number; grossMarginPct: number;
  opex: number; ebitda: number; ebitdaPct: number; units: number; orders: number;
  revenueYoY: number | null; activeCustomers: number; headcount: number; marketSharePct: number;
}
export interface PLPoint { month: string; revenue: number; cogs: number; grossMargin: number; opex: number; ebitda: number; }
export interface BreakdownRow { key: string; revenue: number; grossMargin: number; marginPct: number; units: number; }
export interface CustomerRow extends BreakdownRow { segment: string; }
export interface ForecastSeries {
  history: { month: string; revenue: number }[];
  scenarios: Record<string, { month: string; revenue: number; costs: number; margin: number }[]>;
  drivers: { scenario: string; driver: string; value: number; unit: string; note: string }[];
}
export interface Competitors {
  latest: { name: string; isSelf: boolean; marketShare: number; nps: number; priceIndex: number }[];
  shareTrend: { month: string; [name: string]: number | string }[];
}
export interface EmployeeStats {
  total: number; payroll: number; avgSalary: number;
  byDepartment: { department: string; headcount: number; avgSalary: number }[];
  byType: { type: string; headcount: number }[];
}
export interface DataBundle {
  ok: true;
  options: FilterOptions;
  filters: Filters;
  kpis: Kpis;
  pl: PLPoint[];
  breakdown: { division: BreakdownRow[]; region: BreakdownRow[]; channel: BreakdownRow[]; segment: BreakdownRow[]; category: BreakdownRow[] };
  topProducts: BreakdownRow[];
  topCustomers: CustomerRow[];
  costs: { category: string; amount: number }[];
  budget: BudgetPoint[];
  forecast: ForecastSeries;
  competitors: Competitors;
  employees: EmployeeStats;
}
