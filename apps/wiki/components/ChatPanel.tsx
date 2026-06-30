"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Markdown from "./Markdown";
import type { ChatMessage, Citation, RelatedRef } from "./types";

export default function ChatPanel({
  assistantName,
  companyName,
  suggestions,
  messages,
  onSend,
  disabled,
  remaining,
  onOpenCitation,
  onOpenRelated,
  maxLen,
}: {
  assistantName: string;
  companyName: string;
  suggestions: string[];
  messages: ChatMessage[];
  onSend: (q: string) => void;
  disabled: boolean;
  remaining: number | null;
  onOpenCitation: (c: Citation) => void;
  onOpenRelated: (r: RelatedRef) => void;
  maxLen: number;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit() {
    const q = input.trim();
    if (!q || disabled) return;
    onSend(q);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* header */}
      <div className="px-5 py-4 border-b border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[color:var(--color-night)] text-[color:var(--color-paper)] grid place-items-center text-sm font-bold">
            {companyName.charAt(0)}
          </div>
          <div>
            <div className="font-display font-bold leading-tight">{assistantName}</div>
            <div className="text-[11px] text-[color:var(--color-ink-soft)]">
              {companyName} · knowledge base
            </div>
          </div>
        </div>
        {remaining != null && (
          <div className="text-[11px] text-[color:var(--color-ink-soft)] glass rounded-full px-2.5 py-1">
            {remaining} domande rimaste
          </div>
        )}
      </div>

      {/* messaggi */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {empty && (
          <div className="h-full flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="font-display font-bold text-2xl mb-2">Ciao 👋</h3>
              <p className="text-[color:var(--color-ink-soft)] mb-5 text-sm leading-relaxed">
                Sono l&apos;assistente documentale di {companyName}. Chiedimi qualcosa: ti
                risponderò citando i documenti e mostrandoti le sezioni collegate.
              </p>
              <div className="grid gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    disabled={disabled}
                    className="text-left text-sm glass rounded-xl px-4 py-3 hover:bg-white hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div className={m.role === "user" ? "max-w-[85%]" : "w-full"}>
                {m.role === "user" ? (
                  <div className="bg-[color:var(--color-night)] text-[color:var(--color-paper)] rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                    {m.content}
                  </div>
                ) : (
                  <AssistantBubble m={m} onOpenCitation={onOpenCitation} onOpenRelated={onOpenRelated} />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* input */}
      <div className="px-5 py-4 border-t border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
        <div className="glass rounded-2xl p-2 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, maxLen))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={disabled ? "In attesa…" : "Scrivi la tua domanda…"}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent outline-none px-2 py-2 text-sm max-h-32 disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={disabled || !input.trim()}
            className="h-9 w-9 shrink-0 rounded-xl bg-[color:var(--color-night)] text-[color:var(--color-paper)] grid place-items-center disabled:opacity-30 transition-opacity hover:opacity-90"
            aria-label="Invia"
          >
            ↑
          </button>
        </div>
        <p className="text-[10px] text-[color:var(--color-faint)] mt-2 text-center">
          Le risposte si basano solo sui documenti della demo. Verifica sempre le fonti citate.
        </p>
      </div>
    </div>
  );
}

function AssistantBubble({
  m,
  onOpenCitation,
  onOpenRelated,
}: {
  m: ChatMessage;
  onOpenCitation: (c: Citation) => void;
  onOpenRelated: (r: RelatedRef) => void;
}) {
  const streaming = m.status === "streaming";
  return (
    <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
      {/* anteprima fonti consultate */}
      {streaming && m.retrieved && m.retrieved.length > 0 && !m.content && (
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-soft)] mb-1">
          <span className="inline-flex gap-1">
            <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
          </span>
          Sto consultando {m.retrieved.length} sezioni…
        </div>
      )}

      <div className="prose-wiki text-sm">
        <Markdown content={m.content || (streaming ? "" : "-")} />
        {streaming && m.content && <span className="inline-block w-1.5 h-4 align-middle bg-[color:var(--color-ink)] ml-0.5 animate-pulse" />}
      </div>

      {/* citazioni */}
      {m.citations && m.citations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-1.5">
            Fonti
          </div>
          <div className="flex flex-wrap gap-1.5">
            {m.citations.map((c, i) => (
              <button
                key={c.pageId}
                onClick={() => onOpenCitation(c)}
                className="group inline-flex items-center gap-1.5 text-xs rounded-lg bg-[color:var(--color-wash-cyan)] hover:bg-[color:var(--color-accent-cyan)] px-2.5 py-1.5 transition-colors text-left"
                title={c.quote}
              >
                <span className="font-mono text-[10px] bg-white/70 rounded px-1">{i + 1}</span>
                <span className="font-medium">{c.title}</span>
                {c.category && c.category !== "Generale" && (
                  <span className="text-[color:var(--color-ink-soft)] group-hover:text-[color:var(--color-ink)]">
                    › {c.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* sezioni collegate */}
      {m.related && m.related.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-ink-soft)] mb-1.5">
            Continua a esplorare
          </div>
          <div className="flex flex-wrap gap-1.5">
            {m.related.map((r) => (
              <button
                key={r.pageId}
                onClick={() => onOpenRelated(r)}
                className="inline-flex items-center gap-1 text-xs rounded-full border border-[color:color-mix(in_srgb,var(--color-ink)_12%,transparent)] hover:border-[color:var(--color-accent-blue)] hover:bg-[color:var(--color-wash-blue)] px-2.5 py-1 transition-colors"
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-blue)] inline-block"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay: d }}
    />
  );
}
