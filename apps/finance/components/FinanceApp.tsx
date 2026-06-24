"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, TrendingUp, LineChart, Swords, Users, Sparkles, RotateCcw } from "lucide-react";
import { Overview, Sales, Forecast, Market, People } from "./views";
import { Skeleton } from "./ui";
import Chat from "./Chat";
import { monthLabel } from "@/lib/format";
import type { DataBundle, Filters } from "@/lib/types";

type Status = "loading" | "turnstile" | "ready" | "error";
type Section = "overview" | "sales" | "forecast" | "market" | "people";

const SECTIONS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Panoramica", icon: LayoutDashboard },
  { id: "sales", label: "Vendite", icon: TrendingUp },
  { id: "forecast", label: "Forecast", icon: LineChart },
  { id: "market", label: "Mercato", icon: Swords },
  { id: "people", label: "Persone", icon: Users },
];

export default function FinanceApp({ turnstileSiteKey, ctaUrl, rateLimitMax, rateWindowMin }: {
  turnstileSiteKey: string; ctaUrl: string; rateLimitMax: number; rateWindowMin: number;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<DataBundle | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [section, setSection] = useState<Section>("overview");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [limit, setLimit] = useState<string | null>(null);
  const [defaulted, setDefaulted] = useState(false);

  const fetchData = useCallback(async (f: Filters) => {
    setFetching(true);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filters: f }) });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        if (d.error === "concurrency") setLimit(d.message);
        else if (d.error === "session") { setStatus("error"); setErrorMsg(d.message ?? "Sessione scaduta."); }
        return;
      }
      setData(d as DataBundle);
    } catch { setLimit("Errore di rete nel caricamento dei dati."); }
    finally { setFetching(false); }
  }, []);

  const createSession = useCallback(async (turnstileToken?: string) => {
    try {
      const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ turnstileToken }) });
      const d = await res.json();
      if (!res.ok || !d.ok) { setErrorMsg(d.message ?? "Impossibile avviare la sessione."); setStatus("error"); return; }
      setRemaining(typeof d.remaining === "number" ? d.remaining : rateLimitMax);
      setStatus("ready");
      fetchData({});
    } catch { setErrorMsg("Errore di rete nell'avvio della sessione."); setStatus("error"); }
  }, [rateLimitMax, fetchData]);

  useEffect(() => { if (!turnstileSiteKey) createSession(); else setStatus("turnstile"); }, [turnstileSiteKey, createSession]);

  // default: ultimi 12 mesi (TTM), una volta note le opzioni
  useEffect(() => {
    if (data && !defaulted) {
      setDefaulted(true);
      const months = data.options.months;
      if (months.length >= 12) {
        const f = { monthFrom: months[months.length - 12], monthTo: months[months.length - 1] };
        setFilters(f); fetchData(f);
      }
    }
  }, [data, defaulted, fetchData]);

  const update = (patch: Partial<Filters>) => { const f = { ...filters, ...patch }; (Object.keys(f) as (keyof Filters)[]).forEach((k) => { if (!f[k]) delete f[k]; }); setFilters(f); fetchData(f); };
  const setPreset = (from: string | undefined, to: string | undefined) => update({ monthFrom: from, monthTo: to });
  const reset = () => { const m = data!.options.months; const f = { monthFrom: m[m.length - 12], monthTo: m[m.length - 1] }; setFilters(f); fetchData(f); };

  if (status !== "ready") return <Bootstrap status={status} errorMsg={errorMsg} turnstileSiteKey={turnstileSiteKey} onToken={createSession} onRetry={() => { setStatus(turnstileSiteKey ? "turnstile" : "loading"); if (!turnstileSiteKey) createSession(); }} />;

  return (
    <div className="app-bg min-h-screen flex">
      {/* nav laterale */}
      <nav className="hidden md:flex flex-col items-center gap-1 w-16 shrink-0 py-4 border-r hairline sticky top-0 h-screen">
        <div className="grid place-items-center h-9 w-9 rounded-xl font-display font-bold text-[color:var(--color-bg)] mb-4" style={{ background: "linear-gradient(135deg,var(--color-cyan),var(--color-violet))" }}>V</div>
        {SECTIONS.map((s) => {
          const Icon = s.icon; const active = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)} title={s.label}
              className={`relative grid place-items-center h-11 w-11 rounded-xl transition-colors ${active ? "text-[color:var(--color-cyan)]" : "text-[color:var(--color-faint)] hover:text-white"}`}>
              {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl" style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.35)" }} />}
              <Icon size={19} className="relative z-10" />
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0">
        {/* top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b hairline" style={{ background: "rgba(6,7,10,0.7)", backdropFilter: "blur(12px)" }}>
          <div>
            <div className="font-display font-bold text-lg leading-none">Vertex<span className="text-[color:var(--color-cyan)] glow-text">Finance</span></div>
            <div className="text-[11px] text-[color:var(--color-faint)] mt-0.5">Intelligence finanziaria · <span className="text-[color:var(--color-ink-soft)]">powered by Donq</span></div>
          </div>
          <div className="flex items-center gap-2">
            {remaining != null && <span className="hidden sm:inline text-[11px] text-[color:var(--color-ink-soft)] chip px-2.5 py-1">{remaining} domande AI</span>}
            <button onClick={() => setChatOpen(true)} className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-1.5 text-[color:var(--color-bg)]" style={{ background: "linear-gradient(135deg,var(--color-cyan),var(--color-violet))" }}>
              <Sparkles size={14} /> Copilot AI
            </button>
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-xs font-semibold rounded-full chip px-3.5 py-1.5 hover:border-[color:var(--color-cyan)]/40 transition-colors">Parla con Donq</a>
          </div>
        </header>

        {/* mobile nav */}
        <div className="md:hidden flex gap-1 px-3 py-2 border-b hairline overflow-x-auto">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${section === s.id ? "text-[color:var(--color-cyan)] chip" : "text-[color:var(--color-faint)]"}`}>{s.label}</button>
          ))}
        </div>

        {/* filtri */}
        <FilterBar data={data} filters={filters} onUpdate={update} onPreset={setPreset} onReset={reset} fetching={fetching} />

        {/* contenuto */}
        <main className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
          {!data ? <LoadingGrid /> : (
            <AnimatePresence mode="wait">
              <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {section === "overview" && <Overview d={data} />}
                {section === "sales" && <Sales d={data} />}
                {section === "forecast" && <Forecast d={data} />}
                {section === "market" && <Market d={data} />}
                {section === "people" && <People d={data} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <Chat open={chatOpen} onClose={() => setChatOpen(false)} onRemaining={setRemaining} onLimit={(m) => { setChatOpen(false); setLimit(m); }} />

      <AnimatePresence>
        {limit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLimit(null)} />
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="relative glass p-8 max-w-md w-full text-center">
              <div className="text-3xl mb-3">✨</div>
              <h2 className="font-display font-bold text-xl mb-2">Hai esplorato parecchio!</h2>
              <p className="text-[color:var(--color-ink-soft)] text-sm">{limit}</p>
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-full px-6 py-2.5 font-semibold text-[color:var(--color-bg)]" style={{ background: "linear-gradient(135deg,var(--color-cyan),var(--color-violet))" }}>Prenota un contatto →</a>
              <div><button onClick={() => setLimit(null)} className="text-sm text-[color:var(--color-faint)] mt-3">Chiudi</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Barra filtri ─────────────────────────────────────────────────────── */
function FilterBar({ data, filters, onUpdate, onPreset, onReset, fetching }: {
  data: DataBundle | null; filters: Filters; onUpdate: (p: Partial<Filters>) => void; onPreset: (f?: string, t?: string) => void; onReset: () => void; fetching: boolean;
}) {
  const opts = data?.options;
  const months = opts?.months ?? [];
  const presets = useMemo(() => {
    if (!months.length) return [];
    const max = months[months.length - 1];
    return [
      { label: "TTM", from: months[months.length - 12], to: max },
      { label: "2026", from: "2026-01", to: max },
      { label: "2025", from: "2025-01", to: "2025-12" },
      { label: "2024", from: "2024-01", to: "2024-12" },
      { label: "Tutto", from: months[0], to: max },
    ];
  }, [months]);
  const activePreset = (p: { from: string; to: string }) => filters.monthFrom === p.from && filters.monthTo === p.to;

  return (
    <div className="sticky top-[57px] z-20 px-4 sm:px-6 py-2.5 border-b hairline flex flex-wrap items-center gap-2" style={{ background: "rgba(8,9,12,0.6)", backdropFilter: "blur(10px)" }}>
      <div className="inline-flex chip p-0.5 text-xs">
        {presets.map((p) => (
          <button key={p.label} onClick={() => onPreset(p.from, p.to)} className={`px-2.5 py-1 rounded-full transition-colors ${activePreset(p) ? "text-[color:var(--color-cyan)] bg-[rgba(34,211,238,0.12)]" : "text-[color:var(--color-ink-soft)] hover:text-white"}`}>{p.label}</button>
        ))}
      </div>
      <div className="h-5 w-px bg-[color:var(--color-line)] mx-1 hidden sm:block" />
      <FSelect label="Divisione" value={filters.division} options={opts?.divisions} onChange={(v) => onUpdate({ division: v })} />
      <FSelect label="Area" value={filters.macroArea} options={opts?.macroAreas} onChange={(v) => onUpdate({ macroArea: v })} />
      <FSelect label="Regione" value={filters.region} options={opts?.regions} onChange={(v) => onUpdate({ region: v })} />
      <FSelect label="Canale" value={filters.channel} options={opts?.channels} onChange={(v) => onUpdate({ channel: v })} />
      <FSelect label="Segmento" value={filters.segment} options={opts?.segments} onChange={(v) => onUpdate({ segment: v })} />
      <FSelect label="Categoria" value={filters.category} options={opts?.categories} onChange={(v) => onUpdate({ category: v })} />
      {(filters.division || filters.region || filters.channel || filters.segment || filters.category || filters.macroArea) && (
        <button onClick={onReset} className="inline-flex items-center gap-1 text-xs text-[color:var(--color-faint)] hover:text-white px-2 py-1"><RotateCcw size={12} /> Reset</button>
      )}
      <div className="ml-auto flex items-center gap-2 text-[11px] text-[color:var(--color-faint)]">
        {fetching && <span className="pulse-dot text-[color:var(--color-cyan)]">●</span>}
        {filters.monthFrom && <span className="tnum">{monthLabel(filters.monthFrom)} – {monthLabel(filters.monthTo!)}</span>}
      </div>
    </div>
  );
}

function FSelect({ label, value, options, onChange }: { label: string; value?: string; options?: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className={`appearance-none chip pl-3 pr-7 py-1.5 text-xs cursor-pointer outline-none ${value ? "text-[color:var(--color-cyan)] border-[color:var(--color-cyan)]/40" : "text-[color:var(--color-ink-soft)]"}`}>
        <option value="">{label}: tutti</option>
        {options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--color-faint)] text-[10px]">▼</span>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72" />
      <div className="grid lg:grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
    </div>
  );
}

/* ── Schermata di avvio (sessione / turnstile) ───────────────────────────── */
function Bootstrap({ status, errorMsg, turnstileSiteKey, onToken, onRetry }: {
  status: Status; errorMsg: string; turnstileSiteKey: string; onToken: (t: string) => void; onRetry: () => void;
}) {
  return (
    <main className="app-bg min-h-screen grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 max-w-sm w-full text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl grid place-items-center font-display font-bold text-2xl text-[color:var(--color-bg)]" style={{ background: "linear-gradient(135deg,var(--color-cyan),var(--color-violet))" }}>V</div>
        <h1 className="font-display font-bold text-xl mb-1">Vertex Finance</h1>
        {status === "error" ? (
          <>
            <p className="text-sm text-[color:var(--color-ink-soft)] mt-2">{errorMsg}</p>
            <button onClick={onRetry} className="mt-5 rounded-full px-6 py-2.5 font-semibold text-[color:var(--color-bg)]" style={{ background: "linear-gradient(135deg,var(--color-cyan),var(--color-violet))" }}>Riprova</button>
          </>
        ) : (
          <>
            <p className="text-sm text-[color:var(--color-ink-soft)] mt-2 mb-4">Avvio sicuro della demo…</p>
            {status === "turnstile" && turnstileSiteKey && <div className="flex justify-center"><Turnstile siteKey={turnstileSiteKey} onSuccess={onToken} options={{ theme: "dark" }} /></div>}
          </>
        )}
      </motion.div>
    </main>
  );
}
