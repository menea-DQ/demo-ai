"use client";

import { AnimatePresence, motion } from "framer-motion";

export interface LimitInfo {
  kind: "rate_limit" | "budget" | "concurrency";
  message: string;
  ctaUrl: string;
  resetAt?: number;
}

const TITLES: Record<LimitInfo["kind"], string> = {
  rate_limit: "Hai esplorato parecchio! 🚀",
  budget: "Demo molto richiesta oggi 🔥",
  concurrency: "Tante persone stanno provando la demo 👥",
};

function resetLabel(resetAt?: number): string | null {
  if (!resetAt) return null;
  const ms = resetAt - Date.now();
  if (ms <= 0) return null;
  const min = Math.ceil(ms / 60000);
  return `Potrai riprendere tra circa ${min} ${min === 1 ? "minuto" : "minuti"}.`;
}

export default function LimitModal({
  info,
  onClose,
}: {
  info: LimitInfo | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {info && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[color:var(--color-night)]/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative glass rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-[color:var(--color-accent-rose)] via-[color:var(--color-accent-blue)] to-[color:var(--color-accent-cyan)] grid place-items-center text-3xl">
              ✨
            </div>
            <h2 className="font-display font-extrabold text-2xl mb-2">{TITLES[info.kind]}</h2>
            <p className="text-[color:var(--color-ink-soft)] text-sm leading-relaxed">{info.message}</p>
            {resetLabel(info.resetAt) && (
              <p className="text-[color:var(--color-ink-soft)] text-sm mt-1">{resetLabel(info.resetAt)}</p>
            )}

            <div className="mt-5 rounded-2xl bg-[color:var(--color-wash-blue)] p-4 text-sm">
              <p className="font-semibold mb-1">Vuoi vederlo sui tuoi documenti?</p>
              <p className="text-[color:var(--color-ink-soft)]">
                Prenota una presentazione: portiamo questa esperienza sulla knowledge base della tua
                azienda, senza limiti.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href={info.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center gap-2 rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-6 py-3 font-semibold hover:scale-[1.02] transition-transform"
              >
                Prenota un contatto →
              </a>
              <button onClick={onClose} className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] py-1">
                Chiudi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
