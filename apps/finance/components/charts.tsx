"use client";

import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart,
} from "recharts";
import { Legend } from "recharts";
import { C, SERIES, SCENARIO_COLORS, eurC, numC, monthLabel } from "@/lib/format";
import type { PLPoint, ForecastSeries, Competitors, BreakdownRow, BudgetPoint } from "@/lib/types";

const axis = { stroke: "#5b6577", fontSize: 11, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />;

function TT({ active, payload, label, fmt }: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
      <div className="text-[color:var(--color-ink-soft)] mb-1">{typeof label === "string" && label.includes("-") ? monthLabel(label) : label}</div>
      {payload.map((p: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
        <div key={p.dataKey} className="flex items-center gap-2 tnum">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
          <span className="text-[color:var(--color-ink-soft)]">{p.name}:</span>
          <span className="text-white">{(fmt ?? eurC)(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* Andamento P&L: area ricavi + linea EBITDA */
export function PLAreaChart({ data }: { data: PLPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} minTickGap={24} />
        <YAxis tickFormatter={(v) => numC(v)} {...axis} width={48} />
        <Tooltip content={<TT />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
        <Area type="monotone" dataKey="revenue" name="Ricavi" stroke={C.cyan} strokeWidth={2} fill="url(#gRev)" />
        <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke={C.emerald} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="opex" name="Opex" stroke={C.rose} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* Donut breakdown */
export function DonutChart({ data, height = 220 }: { data: BreakdownRow[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="revenue" nameKey="key" innerRadius="58%" outerRadius="86%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
        </Pie>
        <Tooltip content={<TT />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* Forecast: storico + 3 scenari */
export function ForecastChart({ fc }: { fc: ForecastSeries }) {
  // unisce storico e scenari su un asse mese unico
  const months = [...fc.history.map((h) => h.month), ...(fc.scenarios.baseline?.map((s) => s.month) ?? [])];
  const data = months.map((m) => {
    const row: Record<string, number | string | null> = { month: m };
    const h = fc.history.find((x) => x.month === m);
    row.storico = h ? h.revenue : null;
    for (const sc of Object.keys(fc.scenarios)) {
      const p = fc.scenarios[sc].find((x) => x.month === m);
      row[sc] = p ? p.revenue : null;
    }
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
        {grid}
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} minTickGap={28} />
        <YAxis tickFormatter={(v) => numC(v)} {...axis} width={48} />
        <Tooltip content={<TT />} />
        <Line type="monotone" dataKey="storico" name="Storico" stroke={C.slate} strokeWidth={2.5} dot={false} connectNulls />
        <Line type="monotone" dataKey="optimistic" name="Ottimistico" stroke={SCENARIO_COLORS.optimistic} strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="baseline" name="Baseline" stroke={SCENARIO_COLORS.baseline} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
        <Line type="monotone" dataKey="pessimistic" name="Pessimistico" stroke={SCENARIO_COLORS.pessimistic} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* Quote di mercato nel tempo */
export function ShareChart({ comp }: { comp: Competitors }) {
  const names = comp.latest.map((c) => c.name);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={comp.shareTrend} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
        {grid}
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} minTickGap={28} />
        <YAxis tickFormatter={(v) => `${v}%`} {...axis} width={40} />
        <Tooltip content={<TT fmt={(v: number) => `${v?.toFixed?.(1) ?? v}%`} />} />
        {names.map((n, i) => {
          const self = comp.latest.find((c) => c.name === n)?.isSelf;
          return <Line key={n} type="monotone" dataKey={n} name={n} stroke={self ? C.cyan : SERIES[(i + 1) % SERIES.length]}
            strokeWidth={self ? 3 : 1.6} dot={false} opacity={self ? 1 : 0.8} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* Budget vs Actual (FY2026): barre actual + linea target */
export function BudgetChart({ data }: { data: BudgetPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
        {grid}
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} minTickGap={16} />
        <YAxis tickFormatter={(v) => numC(v)} {...axis} width={48} />
        <Tooltip content={<TT />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="actual" name="Consuntivo" fill={C.cyan} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="target" name="Budget" stroke={C.amber} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2, fill: C.amber }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* Grafico generato dall'assistente AI (spec controllato) */
export interface AIChartSpec {
  kind: "bar" | "line" | "donut";
  title?: string;
  xKey?: string;
  series?: { key: string; name?: string }[];
  data: Record<string, unknown>[];
}
export function AIChart({ spec }: { spec: AIChartSpec }) {
  const data = (spec.data ?? []).slice(0, 14);
  if (!data.length) return null;
  const xKey = spec.xKey ?? Object.keys(data[0])[0];
  const series: { key: string; name?: string }[] = (spec.series?.length ? spec.series : Object.keys(data[0]).filter((k) => k !== xKey).map((k) => ({ key: k, name: k }))).slice(0, 4);
  const isMonth = typeof data[0][xKey] === "string" && /^\d{4}-\d{2}$/.test(String(data[0][xKey]));
  const xfmt = isMonth ? monthLabel : (v: string) => (String(v).length > 12 ? String(v).slice(0, 11) + "…" : String(v));

  if (spec.kind === "donut") {
    const k = series[0]?.key ?? "value";
    return (
      <div>
        {spec.title && <div className="text-xs font-medium mb-1 text-[color:var(--color-ink-soft)]">{spec.title}</div>}
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={data} dataKey={k} nameKey={xKey} innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
            </Pie>
            <Tooltip content={<TT fmt={numC} />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const Chart = spec.kind === "line" ? LineChart : BarChart;
  return (
    <div>
      {spec.title && <div className="text-xs font-medium mb-1 text-[color:var(--color-ink-soft)]">{spec.title}</div>}
      <ResponsiveContainer width="100%" height={200}>
        <Chart data={data} margin={{ top: 4, right: 6, left: -12, bottom: 0 }}>
          {grid}
          <XAxis dataKey={xKey} tickFormatter={xfmt as (v: string) => string} {...axis} tick={{ fontSize: 9, fill: "#5b6577" }} interval={0} angle={isMonth ? 0 : -18} textAnchor={isMonth ? "middle" : "end"} height={isMonth ? 24 : 40} />
          <YAxis tickFormatter={(v) => numC(Number(v))} {...axis} width={44} />
          <Tooltip content={<TT fmt={numC} />} />
          {series.map((s, i) => spec.kind === "line"
            ? <Line key={s.key} type="monotone" dataKey={s.key} name={s.name ?? s.key} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} />
            : <Bar key={s.key} dataKey={s.key} name={s.name ?? s.key} fill={SERIES[i % SERIES.length]} radius={[3, 3, 0, 0]} />)}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

/* Mini bar chart per la chat (dati generici) */
export function MiniBars({ data, xKey, yKey }: { data: Record<string, unknown>[]; xKey: string; yKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
        {grid}
        <XAxis dataKey={xKey} {...axis} tick={{ fontSize: 9, fill: "#5b6577" }} interval={0} angle={-20} textAnchor="end" height={38} />
        <YAxis tickFormatter={(v) => numC(Number(v))} {...axis} width={42} />
        <Tooltip content={<TT fmt={(v: number) => numC(v)} />} />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
