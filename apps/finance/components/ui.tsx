"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { signedPct } from "@/lib/format";

/* Pannello vetro con titolo */
export function Panel({ title, subtitle, right, className, children, span }: {
  title?: string; subtitle?: string; right?: ReactNode; className?: string; children: ReactNode; span?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={clsx("glass glass-hover p-4 sm:p-5", span, className)}
    >
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="font-display font-semibold text-[0.95rem] text-[color:var(--color-ink)]">{title}</h3>}
            {subtitle && <p className="text-xs text-[color:var(--color-faint)] mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </motion.section>
  );
}

/* Numero animato (count-up) */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => format(0));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(format(v)) });
    return () => controls.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className="tnum">{display}</span>;
}

/* KPI card */
export function KpiCard({ label, value, format, delta, accent = "var(--color-cyan)", hint }: {
  label: string; value: number; format: (n: number) => string; delta?: number | null; accent?: string; hint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="glass glass-hover p-4 relative overflow-hidden"
    >
      <div className="absolute -top-px left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
        {label}
      </div>
      <div className="font-display font-bold text-2xl mt-2 text-white">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && <Delta value={delta} />}
        {hint && <span className="text-[color:var(--color-faint)]">{hint}</span>}
      </div>
    </motion.div>
  );
}

export function Delta({ value, suffix = " YoY" }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
      pos ? "text-[color:var(--color-emerald)]" : "text-[color:var(--color-rose)]")}
      style={{ background: pos ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)" }}>
      {pos ? "▲" : "▼"} {signedPct(value)}<span className="text-[color:var(--color-faint)]">{suffix}</span>
    </span>
  );
}

/* Controllo segmentato */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex chip p-0.5 text-xs">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={clsx("relative px-2.5 py-1 rounded-full transition-colors",
            value === o.value ? "text-white" : "text-[color:var(--color-ink-soft)] hover:text-white")}>
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-full"
              style={{ background: "rgba(34,211,238,0.16)", border: "1px solid rgba(34,211,238,0.4)" }} transition={{ type: "spring", stiffness: 400, damping: 32 }} />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* Lista a barre orizzontali */
export function BarList({ items, accent = "var(--color-cyan)", format }: {
  items: { label: string; value: number; sub?: string }[]; accent?: string; format: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={it.label} className="group">
          <div className="flex items-baseline justify-between text-xs mb-1">
            <span className="text-[color:var(--color-ink)] truncate pr-2">{it.label}</span>
            <span className="tnum text-[color:var(--color-ink-soft)] shrink-0">{format(it.value)}{it.sub && <span className="text-[color:var(--color-faint)] ml-1">{it.sub}</span>}</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(it.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${accent}aa, ${accent})`, boxShadow: `0 0 10px ${accent}55` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-xl", className)} />;
}
