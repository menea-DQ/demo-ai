"use client";

import { useCallback, useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type Status = "loading" | "turnstile" | "ready" | "error";

interface CategoryTotal { category: string; type: string; total: number; }
interface MonthlyPoint { month: string; ricavi: number; costi: number; margine: number; }
interface QueryData { categories: string[]; totals: CategoryTotal[]; trend: MonthlyPoint[]; remaining: number; }

const eur = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function FinanceApp({
  turnstileSiteKey,
  ctaUrl,
  rateLimitMax,
  rateWindowMin,
}: {
  turnstileSiteKey: string;
  ctaUrl: string;
  rateLimitMax: number;
  rateWindowMin: number;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<QueryData | null>(null);
  const [category, setCategory] = useState<string>("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<{ message: string } | null>(null);

  const runQuery = useCallback(async (cat?: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: cat || undefined }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        if (d.error === "rate_limit" || d.error === "budget" || d.error === "concurrency") {
          setLimit({ message: d.message });
          if (d.error === "rate_limit") setRemaining(0);
        } else if (d.error === "session") {
          setStatus("error");
          setErrorMsg(d.message ?? "Sessione scaduta.");
        }
        return;
      }
      setData(d);
      setRemaining(d.remaining);
    } catch {
      setLimit({ message: "Errore di rete. Riprova." });
    } finally {
      setBusy(false);
    }
  }, []);

  const createSession = useCallback(async (turnstileToken?: string) => {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErrorMsg(d.message ?? "Impossibile avviare la sessione.");
        setStatus("error");
        return;
      }
      setRemaining(typeof d.remaining === "number" ? d.remaining : rateLimitMax);
      setStatus("ready");
      runQuery();
    } catch {
      setErrorMsg("Errore di rete nell'avvio della sessione.");
      setStatus("error");
    }
  }, [rateLimitMax, runQuery]);

  useEffect(() => {
    if (!turnstileSiteKey) createSession();
    else setStatus("turnstile");
  }, [turnstileSiteKey, createSession]);

  if (status !== "ready") {
    return (
      <main className="aurora-bg min-h-screen grid place-items-center p-6">
        <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[color:var(--color-night)] text-[color:var(--color-paper)] grid place-items-center font-display font-bold text-xl">€</div>
          <h1 className="font-display font-extrabold text-xl mb-1">Aurora Finance</h1>
          {status === "error" ? (
            <>
              <p className="text-sm text-[color:var(--color-ink-soft)] mt-2">{errorMsg}</p>
              <button onClick={() => { setStatus(turnstileSiteKey ? "turnstile" : "loading"); if (!turnstileSiteKey) createSession(); }} className="mt-5 rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-6 py-2.5 font-semibold">Riprova</button>
            </>
          ) : (
            <>
              <p className="text-sm text-[color:var(--color-ink-soft)] mt-2 mb-4">Avvio sicuro della demo…</p>
              {status === "turnstile" && turnstileSiteKey && (
                <div className="flex justify-center"><Turnstile siteKey={turnstileSiteKey} onSuccess={createSession} options={{ theme: "light" }} /></div>
              )}
            </>
          )}
        </div>
      </main>
    );
  }

  const totRicavi = data?.trend.reduce((a, p) => a + p.ricavi, 0) ?? 0;
  const totCosti = data?.trend.reduce((a, p) => a + p.costi, 0) ?? 0;
  const margine = totRicavi - totCosti;
  const maxBar = Math.max(1, ...(data?.trend.map((p) => p.ricavi) ?? [1]));

  return (
    <main className="aurora-bg min-h-screen">
      {/* header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)] glass">
        <div className="font-display font-extrabold tracking-tight">Aurora<span className="text-[color:var(--color-faint)]">Finance</span></div>
        <div className="flex items-center gap-3">
          {remaining != null && <span className="text-[11px] text-[color:var(--color-ink-soft)] glass rounded-full px-2.5 py-1">{remaining} interrogazioni rimaste</span>}
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-3.5 py-1.5">Parla con Donq</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-display font-extrabold text-3xl mb-1">Cruscotto finanziario 2025</h1>
        <p className="text-[color:var(--color-ink-soft)] mb-6">Officine Meccaniche Aurora · dati interrogati da SQLite (demo · max {rateLimitMax} query / {rateWindowMin} min)</p>

        {/* KPI */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Kpi label="Ricavi" value={eur(totRicavi)} color="var(--color-accent-green)" />
          <Kpi label="Costi" value={eur(totCosti)} color="var(--color-accent-rose)" />
          <Kpi label="Margine" value={eur(margine)} color="var(--color-accent-blue)" />
        </div>

        {/* filtro categoria */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-[color:var(--color-ink-soft)]">Filtra per categoria:</label>
          <select
            value={category}
            disabled={busy}
            onChange={(e) => { setCategory(e.target.value); runQuery(e.target.value); }}
            className="glass rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Tutte</option>
            {data?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {busy && <span className="text-xs text-[color:var(--color-ink-soft)]">…</span>}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* trend mensile */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display font-semibold mb-3">Andamento mensile (ricavi)</h2>
            <div className="space-y-1.5">
              {data?.trend.map((p) => (
                <div key={p.month} className="flex items-center gap-2 text-xs">
                  <span className="w-14 text-[color:var(--color-ink-soft)]">{p.month}</span>
                  <div className="flex-1 bg-[color:var(--color-wash-blue)] rounded">
                    <div className="h-4 rounded bg-[color:var(--color-accent-blue)]" style={{ width: `${(p.ricavi / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-24 text-right tabular-nums">{eur(p.ricavi)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* totali per categoria */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display font-semibold mb-3">Totali per categoria</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--color-ink-soft)] border-b border-[color:color-mix(in_srgb,var(--color-ink)_10%,transparent)]">
                  <th className="py-1.5">Categoria</th><th>Tipo</th><th className="text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {data?.totals.map((t) => (
                  <tr key={t.category} className="border-b border-[color:color-mix(in_srgb,var(--color-ink)_6%,transparent)]">
                    <td className="py-1.5 font-medium">{t.category}</td>
                    <td><span className={`text-xs rounded-full px-2 py-0.5 ${t.type === "ricavo" ? "bg-[color:var(--color-accent-green)]" : "bg-[color:var(--color-accent-rose)]"}`}>{t.type}</span></td>
                    <td className="text-right tabular-nums">{eur(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {limit && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[color:var(--color-night)]/40 backdrop-blur-sm" onClick={() => setLimit(null)} />
          <div className="relative glass rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-3xl mb-3">✨</div>
            <h2 className="font-display font-extrabold text-2xl mb-2">Hai esplorato parecchio!</h2>
            <p className="text-[color:var(--color-ink-soft)] text-sm">{limit.message}</p>
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-6 py-3 font-semibold">Prenota un contatto →</a>
            <div><button onClick={() => setLimit(null)} className="text-sm text-[color:var(--color-ink-soft)] mt-3">Chiudi</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[color:var(--color-ink-soft)]">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}
      </div>
      <div className="font-display font-extrabold text-2xl mt-1 tabular-nums">{value}</div>
    </div>
  );
}
