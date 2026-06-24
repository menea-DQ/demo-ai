"use client";

import { useState } from "react";
import { Panel, KpiCard, BarList, Segmented, Delta } from "./ui";
import { PLAreaChart, DonutChart, ForecastChart, ShareChart, BudgetChart } from "./charts";
import { eur, eurC, pct, signedPct, numC, C, SERIES, SCENARIO_COLORS } from "@/lib/format";
import type { DataBundle, BreakdownRow } from "@/lib/types";

const dimLabels: Record<string, string> = { division: "Divisione", region: "Regione", channel: "Canale", segment: "Segmento", category: "Categoria" };

function Legend({ items }: { items: BreakdownRow[] }) {
  const tot = items.reduce((a, b) => a + b.revenue, 0) || 1;
  return (
    <div className="space-y-1.5 text-xs">
      {items.slice(0, 8).map((it, i) => (
        <div key={it.key} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: SERIES[i % SERIES.length] }} />
          <span className="text-[color:var(--color-ink)] truncate flex-1">{it.key}</span>
          <span className="tnum text-[color:var(--color-ink-soft)]">{pct((it.revenue / tot) * 100)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── OVERVIEW ─────────────────────────────────────────────────────────── */
export function Overview({ d }: { d: DataBundle }) {
  const k = d.kpis;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ricavi netti" value={k.revenue} format={eurC} delta={k.revenueYoY} accent={C.cyan} />
        <KpiCard label="EBITDA" value={k.ebitda} format={eurC} accent={C.emerald} hint={pct(k.ebitdaPct) + " sui ricavi"} />
        <KpiCard label="Margine lordo" value={k.grossMarginPct} format={(n) => pct(n)} accent={C.violet} hint={eurC(k.grossMargin)} />
        <KpiCard label="Quota di mercato" value={k.marketSharePct} format={(n) => pct(n)} accent={C.amber} hint="ultimo mese" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ordini" value={k.orders} format={numC} accent={C.blue} />
        <KpiCard label="Unità vendute" value={k.units} format={numC} accent={C.blue} />
        <KpiCard label="Clienti attivi" value={k.activeCustomers} format={numC} accent={C.pink} />
        <KpiCard label="Organico" value={k.headcount} format={numC} accent={C.slate} hint="dipendenti attivi" />
      </div>

      <Panel title="Conto economico" subtitle="Ricavi, EBITDA e opex per mese">
        <PLAreaChart data={d.pl} />
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Ricavi per divisione">
          <div className="grid grid-cols-2 gap-3 items-center">
            <DonutChart data={d.breakdown.division} />
            <Legend items={d.breakdown.division} />
          </div>
        </Panel>
        <Panel title="Ricavi per canale">
          <BarList items={d.breakdown.channel.map((c) => ({ label: c.key, value: c.revenue, sub: `· ${pct(c.marginPct)} mgn` }))} format={eurC} accent={C.violet} />
        </Panel>
      </div>
    </div>
  );
}

/* ── VENDITE (explorer multi-dimensione) ─────────────────────────────────── */
export function Sales({ d }: { d: DataBundle }) {
  const [dim, setDim] = useState<keyof DataBundle["breakdown"]>("division");
  const rows = d.breakdown[dim];
  return (
    <div className="space-y-4">
      <Panel
        title="Esplora i ricavi"
        subtitle="Incrocia le dimensioni — i filtri in alto restringono il perimetro"
        right={<Segmented value={dim} onChange={(v) => setDim(v as keyof DataBundle["breakdown"])}
          options={(Object.keys(dimLabels) as (keyof DataBundle["breakdown"])[]).map((v) => ({ value: v, label: dimLabels[v] }))} />}
      >
        <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-center">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <DonutChart data={rows} height={200} />
            <Legend items={rows} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--color-faint)] text-xs border-b hairline">
                  <th className="py-2 font-medium">{dimLabels[dim]}</th>
                  <th className="text-right font-medium">Ricavi</th>
                  <th className="text-right font-medium">Margine %</th>
                  <th className="text-right font-medium">Unità</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-b hairline/50 hover:bg-white/[0.03]">
                    <td className="py-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />{r.key}</td>
                    <td className="text-right tnum text-white">{eur(r.revenue)}</td>
                    <td className="text-right tnum" style={{ color: r.marginPct >= 35 ? C.emerald : r.marginPct >= 25 ? C.amber : C.rose }}>{pct(r.marginPct)}</td>
                    <td className="text-right tnum text-[color:var(--color-ink-soft)]">{numC(r.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Top 10 prodotti" subtitle="per ricavi netti">
          <BarList items={d.topProducts.map((p) => ({ label: p.key, value: p.revenue }))} format={eurC} accent={C.cyan} />
        </Panel>
        <Panel title="Top 10 clienti B2B" subtitle="per ricavi netti">
          <BarList items={d.topCustomers.map((c) => ({ label: c.key, value: c.revenue, sub: `· ${c.segment}` }))} format={eurC} accent={C.emerald} />
        </Panel>
      </div>

      <BudgetVsActual d={d} />

      <Panel title="Struttura dei costi operativi" subtitle="opex per categoria (esclusi i COGS)">
        <BarList items={d.costs.map((c) => ({ label: c.category, value: c.amount }))} format={eurC} accent={C.rose} />
      </Panel>
    </div>
  );
}

function BudgetVsActual({ d }: { d: DataBundle }) {
  const b = d.budget;
  const totA = b.reduce((a, p) => a + p.actual, 0);
  const totT = b.reduce((a, p) => a + p.target, 0);
  const attain = totT ? (totA / totT) * 100 : 0;
  const scope = d.filters.division ?? "tutte le divisioni";
  return (
    <Panel title="Budget vs consuntivo · FY2026" subtitle={`Obiettivi mensili di ricavo · ${scope}`}
      right={b.length > 0 ? (
        <div className="text-right">
          <div className="font-display font-bold text-lg" style={{ color: attain >= 100 ? C.emerald : attain >= 92 ? C.amber : C.rose }}>{pct(attain)}</div>
          <div className="text-[11px] text-[color:var(--color-faint)]">raggiungimento</div>
        </div>
      ) : undefined}>
      {b.length > 0 ? (
        <>
          <BudgetChart data={b} />
          <div className="mt-2 flex gap-4 text-xs text-[color:var(--color-ink-soft)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: C.cyan }} /> Consuntivo {eurC(totA)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: C.amber }} /> Budget {eurC(totT)}</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-[color:var(--color-faint)] py-6 text-center">Il budget è definito solo per il <strong className="text-[color:var(--color-ink-soft)]">FY2026</strong>. Seleziona un periodo che includa il 2026 (es. preset «2026» o «TTM»).</p>
      )}
    </Panel>
  );
}

/* ── FORECAST ─────────────────────────────────────────────────────────── */
export function Forecast({ d }: { d: DataBundle }) {
  const fc = d.forecast;
  const total = (sc: string) => fc.scenarios[sc]?.filter((p) => p.month.startsWith("2027")).reduce((a, p) => a + p.revenue, 0) ?? 0;
  const base = total("baseline") || 1;
  const scope = d.filters.division ?? "Vertex Group (totale)";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {["optimistic", "baseline", "pessimistic"].map((sc) => (
          <div key={sc} className="glass p-4 relative overflow-hidden">
            <div className="absolute -top-px left-4 right-4 h-px" style={{ background: `linear-gradient(90deg,transparent,${SCENARIO_COLORS[sc]},transparent)` }} />
            <div className="text-xs uppercase tracking-wide text-[color:var(--color-ink-soft)] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SCENARIO_COLORS[sc] }} />
              {sc === "optimistic" ? "Ottimistico" : sc === "baseline" ? "Baseline" : "Pessimistico"}
            </div>
            <div className="font-display font-bold text-xl mt-2 text-white tnum">{eurC(total(sc))}</div>
            <div className="text-xs text-[color:var(--color-faint)] mt-0.5">ricavi previsti 2027{sc !== "baseline" && <span className="ml-1" style={{ color: SCENARIO_COLORS[sc] }}>{signedPct((total(sc) / base - 1) * 100)} vs baseline</span>}</div>
          </div>
        ))}
      </div>

      <Panel title="Previsioni ricavi" subtitle={`Storico 12 mesi + 18 mesi di forecast · ${scope}`}>
        <ForecastChart fc={fc} />
      </Panel>

      <Panel title="Driver degli scenari" subtitle="le assunzioni dietro le proiezioni">
        <div className="grid sm:grid-cols-3 gap-4">
          {["baseline", "optimistic", "pessimistic"].map((sc) => (
            <div key={sc}>
              <div className="text-xs font-semibold mb-2" style={{ color: SCENARIO_COLORS[sc] }}>
                {sc === "optimistic" ? "Ottimistico" : sc === "baseline" ? "Baseline" : "Pessimistico"}
              </div>
              <div className="space-y-2">
                {fc.drivers.filter((dr) => dr.scenario === sc).map((dr) => (
                  <div key={dr.driver} className="text-xs">
                    <div className="flex justify-between"><span className="text-[color:var(--color-ink-soft)]">{dr.driver}</span><span className="tnum text-white">{dr.value}{dr.unit}</span></div>
                    <div className="text-[color:var(--color-faint)] text-[11px]">{dr.note}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ── MERCATO / COMPETITOR ─────────────────────────────────────────────── */
export function Market({ d }: { d: DataBundle }) {
  const c = d.competitors;
  return (
    <div className="space-y-4">
      <Panel title="Quota di mercato nel tempo" subtitle="Vertex Group vs principali concorrenti">
        <ShareChart comp={c} />
      </Panel>
      <Panel title="Posizionamento competitivo" subtitle="ultimo mese disponibile">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--color-faint)] text-xs border-b hairline">
                <th className="py-2 font-medium">Player</th>
                <th className="text-right font-medium">Quota</th>
                <th className="text-right font-medium">NPS</th>
                <th className="text-right font-medium">Indice prezzi</th>
              </tr>
            </thead>
            <tbody>
              {c.latest.map((p) => (
                <tr key={p.name} className={`border-b hairline/50 ${p.isSelf ? "bg-[rgba(34,211,238,0.06)]" : ""}`}>
                  <td className="py-2 font-medium" style={{ color: p.isSelf ? C.cyan : undefined }}>{p.name}{p.isSelf && " ★"}</td>
                  <td className="text-right tnum text-white">{pct(p.marketShare)}</td>
                  <td className="text-right tnum" style={{ color: p.nps >= 40 ? C.emerald : C.amber }}>{Math.round(p.nps)}</td>
                  <td className="text-right tnum text-[color:var(--color-ink-soft)]">{p.priceIndex.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ── PERSONE (HR) ─────────────────────────────────────────────────────── */
export function People({ d }: { d: DataBundle }) {
  const e = d.employees;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Organico attivo" value={e.total} format={numC} accent={C.cyan} />
        <KpiCard label="Costo personale / mese" value={e.payroll} format={eurC} accent={C.rose} />
        <KpiCard label="RAL media mensile" value={e.avgSalary} format={eur} accent={C.violet} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Organico per dipartimento">
          <BarList items={e.byDepartment.map((x) => ({ label: x.department, value: x.headcount, sub: `· ${eur(x.avgSalary)} media` }))} format={(n) => `${n}`} accent={C.cyan} />
        </Panel>
        <Panel title="Tipologia contrattuale">
          <BarList items={e.byType.map((x) => ({ label: x.type, value: x.headcount }))} format={(n) => `${n}`} accent={C.emerald} />
        </Panel>
      </div>
    </div>
  );
}
