"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { motion } from "framer-motion";
import ChatPanel from "./ChatPanel";
import DocViewer from "./DocViewer";
import GraphView from "./GraphView";
import LimitModal, { type LimitInfo } from "./LimitModal";
import type { ChatMessage, ClientGraph, DocTarget, RelatedRef } from "./types";
import type { Citation } from "@/lib/types";

type SessionStatus = "loading" | "turnstile" | "ready" | "error";
type Tab = "doc" | "graph";

let msgSeq = 0;
const newId = () => `m${++msgSeq}-${Math.random().toString(36).slice(2, 7)}`;

export default function WikiApp({
  graph,
  turnstileSiteKey,
  ctaUrl,
  rateLimitMax,
  rateWindowMin,
  maxQuestionLen,
}: {
  graph: ClientGraph;
  turnstileSiteKey: string;
  ctaUrl: string;
  rateLimitMax: number;
  rateWindowMin: number;
  maxQuestionLen: number;
}) {
  const [session, setSession] = useState<SessionStatus>("loading");
  const [sessionError, setSessionError] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [target, setTarget] = useState<DocTarget | null>(null);
  const [tab, setTab] = useState<Tab>("graph");
  const [mobilePane, setMobilePane] = useState<"chat" | "explore">("chat");
  const [limit, setLimit] = useState<LimitInfo | null>(null);
  const nonceRef = useRef(0);

  /* ---------------- Sessione + Turnstile ---------------- */
  const createSession = useCallback(async (turnstileToken?: string) => {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.error === "concurrency") {
          setLimit({ kind: "concurrency", message: data.message, ctaUrl: data.ctaUrl ?? ctaUrl });
        }
        setSessionError(data.message ?? "Impossibile avviare la sessione.");
        setSession("error");
        return;
      }
      setRemaining(typeof data.remaining === "number" ? data.remaining : rateLimitMax);
      setSession("ready");
    } catch {
      setSessionError("Errore di rete nell'avvio della sessione.");
      setSession("error");
    }
  }, [ctaUrl, rateLimitMax]);

  useEffect(() => {
    if (!turnstileSiteKey) {
      // Turnstile non configurato (sviluppo): avvia direttamente.
      createSession();
    } else {
      setSession("turnstile");
    }
  }, [turnstileSiteKey, createSession]);

  /* ---------------- Navigazione pagine wiki ---------------- */
  const openPage = useCallback((pageId: string, quote?: string) => {
    nonceRef.current += 1;
    setTarget({ pageId, quote, nonce: nonceRef.current });
    setTab("doc");
    setMobilePane("explore");
  }, []);

  const openWikiLink = useCallback((pageId: string) => openPage(pageId), [openPage]);
  const openCitation = useCallback((c: Citation) => openPage(c.pageId, c.quote), [openPage]);
  const openRelated = useCallback((r: RelatedRef) => openPage(r.pageId), [openPage]);

  /* ---------------- Invio domanda + streaming ---------------- */
  const send = useCallback(
    async (question: string) => {
      if (busy || session !== "ready") return;
      setBusy(true);

      const userMsg: ChatMessage = { id: newId(), role: "user", content: question, status: "done" };
      const aId = newId();
      const assistantMsg: ChatMessage = { id: aId, role: "assistant", content: "", status: "streaming" };
      setMessages((m) => [...m, userMsg, assistantMsg]);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((list) => list.map((m) => (m.id === aId ? fn(m) : m)));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // rimuove il placeholder assistant
          setMessages((list) => list.filter((m) => m.id !== aId));
          if (data.error === "rate_limit" || data.error === "budget" || data.error === "concurrency") {
            setLimit({
              kind: data.error,
              message: data.message,
              ctaUrl: data.ctaUrl ?? ctaUrl,
              resetAt: data.resetAt,
            });
            if (data.error === "rate_limit") setRemaining(0);
          } else if (data.error === "session") {
            setSession("error");
            setSessionError(data.message ?? "Sessione scaduta.");
          } else {
            patchError(setMessages, aId, data.message);
          }
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let firstCitationOpened = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(line);
            } catch {
              continue;
            }
            if (ev.type === "meta") {
              patch((m) => ({ ...m, retrieved: ev.retrieved as ChatMessage["retrieved"] }));
            } else if (ev.type === "token") {
              patch((m) => ({ ...m, content: m.content + (ev.text as string) }));
            } else if (ev.type === "citations") {
              const citations = ev.citations as Citation[];
              const related = ev.related as RelatedRef[];
              patch((m) => ({ ...m, citations, related }));
              if (!firstCitationOpened && citations && citations.length > 0) {
                firstCitationOpened = true;
                openCitation(citations[0]);
              }
            } else if (ev.type === "done") {
              if (typeof ev.remaining === "number") setRemaining(ev.remaining as number);
              patch((m) => ({ ...m, status: "done" }));
            } else if (ev.type === "error") {
              patch((m) => ({ ...m, status: "error", content: m.content || (ev.message as string) }));
            }
          }
        }
        patch((m) => (m.status === "streaming" ? { ...m, status: "done" } : m));
      } catch {
        patchError(setMessages, aId, "Errore di rete. Riprova.");
      } finally {
        setBusy(false);
      }
    },
    [busy, session, ctaUrl, openCitation]
  );

  /* ---------------- Nodi attivi nel grafo ---------------- */
  const activeIds = useMemo(() => {
    const ids = new Set<string>();
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    lastAssistant?.citations?.forEach((c) => ids.add(c.pageId));
    lastAssistant?.related?.forEach((r) => ids.add(r.pageId));
    if (target?.pageId) ids.add(target.pageId);
    return [...ids];
  }, [messages, target]);

  /* ---------------- Render ---------------- */
  if (session !== "ready") {
    return (
      <Bootstrap
        status={session}
        siteKey={turnstileSiteKey}
        error={sessionError}
        onToken={(t) => createSession(t)}
        onRetry={() => {
          setSession(turnstileSiteKey ? "turnstile" : "loading");
          if (!turnstileSiteKey) createSession();
        }}
      />
    );
  }

  return (
    <div className="aurora-bg h-screen flex flex-col overflow-hidden">
      <TopBar rateLimitMax={rateLimitMax} rateWindowMin={rateWindowMin} ctaUrl={ctaUrl} />

      {/* toggle mobile */}
      <div className="lg:hidden flex border-b border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)] glass">
        {(["chat", "explore"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setMobilePane(p)}
            className={`flex-1 py-2.5 text-sm font-medium ${
              mobilePane === p ? "text-[color:var(--color-ink)] border-b-2 border-[color:var(--color-ink)]" : "text-[color:var(--color-ink-soft)]"
            }`}
          >
            {p === "chat" ? "Chat" : "Esplora"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(380px,42%)_1fr]">
        {/* Chat */}
        <div className={`min-h-0 glass border-r border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)] ${mobilePane === "chat" ? "block" : "hidden"} lg:block`}>
          <ChatPanel
            messages={messages}
            onSend={send}
            disabled={busy}
            remaining={remaining}
            onOpenCitation={openCitation}
            onOpenRelated={openRelated}
            maxLen={maxQuestionLen}
          />
        </div>

        {/* Workspace */}
        <div className={`min-h-0 flex flex-col ${mobilePane === "explore" ? "block" : "hidden"} lg:flex`}>
          <div className="flex items-center gap-1 px-4 pt-3">
            <TabBtn active={tab === "doc"} onClick={() => setTab("doc")}>📄 Documento</TabBtn>
            <TabBtn active={tab === "graph"} onClick={() => setTab("graph")}>🕸️ Knowledge Graph</TabBtn>
          </div>
          <motion.div layout className="flex-1 min-h-0 m-3 mt-2 rounded-2xl glass overflow-hidden">
            <div className={`h-full ${tab === "doc" ? "block" : "hidden"}`}>
              <DocViewer graph={graph} target={target} onWikiLink={openWikiLink} />
            </div>
            <div className={`h-full ${tab === "graph" ? "block" : "hidden"}`}>
              <GraphView graph={graph} activeIds={activeIds} onOpenPage={openWikiLink} />
            </div>
          </motion.div>
        </div>
      </div>

      <LimitModal info={limit} onClose={() => setLimit(null)} />
    </div>
  );
}

function patchError(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  id: string,
  message?: string
) {
  setMessages((list) =>
    list.map((m) => (m.id === id ? { ...m, status: "error", content: message ?? "Si è verificato un errore." } : m))
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm rounded-xl px-3.5 py-2 font-medium transition-colors ${
        active ? "bg-[color:var(--color-night)] text-[color:var(--color-paper)]" : "glass hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function TopBar({ rateLimitMax, rateWindowMin, ctaUrl }: { rateLimitMax: number; rateWindowMin: number; ctaUrl: string }) {
  return (
    <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)] glass">
      <a href="/" className="font-display font-extrabold tracking-tight">
        Aurora<span className="text-[color:var(--color-faint)]">Wiki</span>
      </a>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-[11px] text-[color:var(--color-ink-soft)]">
          Demo · max {rateLimitMax} domande / {rateWindowMin} min
        </span>
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-3.5 py-1.5 hover:scale-[1.03] transition-transform"
        >
          Parla con Donq
        </a>
      </div>
    </header>
  );
}

function Bootstrap({
  status,
  siteKey,
  error,
  onToken,
  onRetry,
}: {
  status: SessionStatus;
  siteKey: string;
  error: string;
  onToken: (t: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="aurora-bg min-h-screen grid place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 max-w-sm w-full text-center"
      >
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[color:var(--color-night)] text-[color:var(--color-paper)] grid place-items-center font-display font-bold text-xl">
          A
        </div>
        <h1 className="font-display font-extrabold text-xl mb-1">Aurora Wiki</h1>

        {status === "error" ? (
          <>
            <p className="text-sm text-[color:var(--color-ink-soft)] mt-2">{error}</p>
            <button
              onClick={onRetry}
              className="mt-5 rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-6 py-2.5 font-semibold"
            >
              Riprova
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[color:var(--color-ink-soft)] mt-2 mb-5">
              Stiamo avviando la demo in modo sicuro…
            </p>
            {status === "turnstile" && siteKey && (
              <div className="flex justify-center">
                <Turnstile siteKey={siteKey} onSuccess={onToken} options={{ theme: "light" }} />
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <span className="inline-flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent-rose)] animate-bounce [animation-delay:-0.2s]" />
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent-blue)] animate-bounce [animation-delay:-0.1s]" />
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent-cyan)] animate-bounce" />
              </span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
