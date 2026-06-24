"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, X, Send, Database, Wrench, ChevronDown } from "lucide-react";
import { numC } from "@/lib/format";
import { AIChart, type AIChartSpec } from "./charts";

interface Step { tool: string; args: Record<string, unknown>; data?: unknown; }
interface Msg { role: "user" | "assistant"; text: string; steps: Step[]; chart?: AIChartSpec; error?: string; streaming?: boolean; }

const TOOL_LABEL: Record<string, string> = {
  get_kpis: "KPI di sintesi", get_pl_trend: "Conto economico", get_breakdown: "Breakdown ricavi",
  get_top_products: "Top prodotti", get_top_customers: "Top clienti", get_cost_breakdown: "Struttura costi",
  get_forecast: "Forecast", get_competitors: "Analisi competitor", get_employee_stats: "Dati HR", run_sql: "Query SQL",
};

const SUGGESTIONS = [
  "Qual è il trend dell'EBITDA negli ultimi 12 mesi?",
  "Confronta i ricavi per canale nel 2026",
  "Previsioni di fatturato 2027 nello scenario ottimistico",
  "Quali sono le 5 divisioni più redditizie per margine?",
  "Come sta evolvendo la nostra quota di mercato vs MegaMart?",
];

export default function Chat({ open, onClose, onRemaining, onLimit }: {
  open: boolean; onClose: () => void; onRemaining: (n: number) => void; onLimit: (msg: string) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    // cronologia dei turni precedenti (per i follow-up come "spiega", "perché?")
    const history = msgs
      .filter((m) => !m.error && m.text.trim())
      .map((m) => ({ role: m.role, content: m.text }));
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: q, steps: [] }, { role: "assistant", text: "", steps: [], streaming: true }]);
    const patch = (fn: (m: Msg) => Msg) => setMsgs((arr) => arr.map((m, i) => (i === arr.length - 1 ? fn(m) : m)));
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, history }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (["rate_limit", "budget", "concurrency"].includes(d.error)) { onLimit(d.message); patch((m) => ({ ...m, streaming: false, text: "" })); setMsgs((a) => a.slice(0, -1)); }
        else patch((m) => ({ ...m, streaming: false, error: d.message ?? "Errore." }));
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "tool_start") patch((m) => ({ ...m, steps: [...m.steps, { tool: ev.tool as string, args: (ev.args as Record<string, unknown>) ?? {} }] }));
          else if (ev.type === "tool_result") patch((m) => { const s = [...m.steps]; for (let i = s.length - 1; i >= 0; i--) if (s[i].tool === ev.tool && s[i].data === undefined) { s[i] = { ...s[i], data: ev.data }; break; } return { ...m, steps: s }; });
          else if (ev.type === "token") patch((m) => ({ ...m, text: m.text + (ev.text as string) }));
          else if (ev.type === "chart") patch((m) => ({ ...m, chart: ev.spec as AIChartSpec }));
          else if (ev.type === "error") patch((m) => ({ ...m, error: ev.message as string }));
          else if (ev.type === "done") onRemaining(ev.remaining as number);
        }
      }
    } catch {
      patch((m) => ({ ...m, error: "Errore di rete. Riprova." }));
    } finally {
      setBusy(false);
      patch((m) => ({ ...m, streaming: false }));
    }
  }, [busy, msgs, onLimit, onRemaining]);

  return (
    <>
      {/* overlay: solo su mobile quando il drawer è aperto */}
      <div onClick={onClose}
        className={clsx("fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")} />
      {/* pannello: sempre visibile da lg in su (colonna fissa); drawer scorrevole sotto lg */}
      <aside
        className={clsx(
          "fixed lg:sticky inset-y-0 right-0 lg:top-0 z-50 lg:z-10 h-screen w-full sm:w-[420px] lg:w-[400px] shrink-0 flex flex-col border-l hairline transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
        style={{ background: "linear-gradient(180deg, rgba(14,17,23,0.96), rgba(8,9,12,0.98))" }}
      >
            <header className="flex items-center justify-between px-4 py-3 border-b hairline">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center h-8 w-8 rounded-lg" style={{ background: "rgba(34,211,238,0.14)", border: "1px solid rgba(34,211,238,0.4)" }}>
                  <Sparkles size={16} className="text-[color:var(--color-cyan)]" />
                </span>
                <div>
                  <div className="font-display font-semibold text-sm leading-tight">Vertex Copilot</div>
                  <div className="text-[11px] text-[color:var(--color-faint)]">assistente AI sui dati</div>
                </div>
              </div>
              <button onClick={onClose} className="text-[color:var(--color-ink-soft)] hover:text-white p-1 lg:hidden"><X size={18} /></button>
            </header>

            <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {msgs.length === 0 && (
                <div className="text-sm text-[color:var(--color-ink-soft)]">
                  <p className="mb-3">Chiedi qualsiasi cosa sui dati di Vertex Group. L&apos;assistente interroga il database e costruisce analisi e previsioni.</p>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="block w-full text-left text-xs chip px-3 py-2 hover:border-[color:var(--color-cyan)]/40 transition-colors">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => <MessageView key={i} m={m} />)}
            </div>

            <div className="p-3 border-t hairline">
              <div className="flex items-end gap-2 chip px-2 py-1.5">
                <textarea
                  value={input} onChange={(e) => setInput(e.target.value)} rows={1}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                  placeholder="Chiedi ai tuoi dati…" disabled={busy}
                  className="flex-1 bg-transparent resize-none outline-none text-sm py-1 px-1 max-h-28 placeholder:text-[color:var(--color-faint)]"
                />
                <button onClick={() => ask(input)} disabled={busy || !input.trim()}
                  className="grid place-items-center h-8 w-8 rounded-lg disabled:opacity-40 transition-opacity"
                  style={{ background: "rgba(34,211,238,0.16)", border: "1px solid rgba(34,211,238,0.4)" }}>
                  <Send size={15} className="text-[color:var(--color-cyan)]" />
                </button>
              </div>
            </div>
      </aside>
    </>
  );
}

function MessageView({ m }: { m: Msg }) {
  if (m.role === "user") {
    return <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm text-white" style={{ background: "rgba(34,211,238,0.14)", border: "1px solid rgba(34,211,238,0.3)" }}>{m.text}</div></div>;
  }
  return (
    <div className="space-y-2">
      {m.steps.map((s, i) => <StepView key={i} step={s} />)}
      {m.text && (
        <div className="prose-chat text-[color:var(--color-ink)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
        </div>
      )}
      {m.chart && (
        <div className="chip p-3 mt-1">
          <AIChart spec={m.chart} />
        </div>
      )}
      {m.streaming && !m.text && <div className="flex items-center gap-2 text-xs text-[color:var(--color-faint)]"><span className="pulse-dot">●</span> elaboro…</div>}
      {m.error && <div className="text-xs text-[color:var(--color-rose)] chip px-3 py-2" style={{ borderColor: "rgba(251,113,133,0.3)" }}>{m.error}</div>}
    </div>
  );
}

function StepView({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const isSql = step.tool === "run_sql";
  const sql = isSql ? (step.args.query as string) : "";
  const result = step.data as { rows?: Record<string, unknown>[]; columns?: string[]; error?: string } | undefined;
  return (
    <div className="text-xs">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 chip px-2.5 py-1 text-[color:var(--color-ink-soft)] hover:text-white transition-colors">
        {isSql ? <Database size={12} /> : <Wrench size={12} />}
        <span>{TOOL_LABEL[step.tool] ?? step.tool}</span>
        {step.data !== undefined && <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      <AnimatePresence>
        {open && step.data !== undefined && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-1.5 chip p-2 space-y-2">
              {isSql && sql && <pre className="font-mono text-[10.5px] text-[color:var(--color-cyan)] whitespace-pre-wrap break-words">{sql}</pre>}
              {result?.rows && result.rows.length > 0 && <ResultTable rows={result.rows} columns={result.columns ?? Object.keys(result.rows[0])} />}
              {result?.error && <div className="text-[color:var(--color-rose)]">{result.error}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  const fmt = (v: unknown) => (typeof v === "number" ? (Math.abs(v) >= 1000 ? numC(v) : String(Math.round(v * 100) / 100)) : String(v ?? ""));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10.5px]">
        <thead><tr className="text-[color:var(--color-faint)]">{columns.map((c) => <th key={c} className="text-left font-medium px-1.5 py-0.5">{c}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 6).map((r, i) => (
            <tr key={i} className="border-t hairline">{columns.map((c) => <td key={c} className="px-1.5 py-0.5 tnum text-[color:var(--color-ink-soft)]">{fmt(r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {rows.length > 6 && <div className="text-[10px] text-[color:var(--color-faint)] mt-1">+{rows.length - 6} righe…</div>}
    </div>
  );
}
