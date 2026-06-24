"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import Markdown from "./Markdown";
import { slugify } from "@/lib/slug";
import type { ClientGraph, DocTarget } from "./types";

const TYPE_LABEL: Record<string, string> = { source: "Sorgente", concept: "Concetto", entity: "Entità" };

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Scrolla SOLO il contenitore (mai la finestra) per portare l'elemento in vista. */
function scrollContainerTo(container: HTMLElement, el: HTMLElement) {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  container.scrollTop += e.top - c.top - container.clientHeight / 3;
}

function highlightQuote(container: HTMLElement, quote: string): HTMLElement | null {
  const needle = norm(quote).toLowerCase();
  if (needle.length < 4) return null;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "";
    if (norm(text).toLowerCase().indexOf(needle) === -1) continue;
    const rawIdx = text.toLowerCase().indexOf(quote.slice(0, 14).toLowerCase());
    const start = rawIdx >= 0 ? rawIdx : 0;
    const end = Math.min(text.length, start + quote.length);
    try {
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      const mark = document.createElement("span");
      mark.className = "cited";
      range.surroundContents(mark);
      return mark;
    } catch {
      return null;
    }
  }
  return null;
}

export default function DocViewer({
  graph,
  target,
  onWikiLink,
}: {
  graph: ClientGraph;
  target: DocTarget | null;
  onWikiLink: (pageId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const page = useMemo(
    () => (target ? graph.pages.find((p) => p.id === target.pageId) : null),
    [graph.pages, target]
  );

  // table of contents dalle intestazioni ## del markdown
  const toc = useMemo(() => {
    if (!page) return [];
    const out: { id: string; text: string }[] = [];
    for (const line of page.markdown.split("\n")) {
      const m = /^##\s+(.+?)\s*$/.exec(line);
      if (m) out.push({ id: slugify(m[1]), text: m[1] });
    }
    return out;
  }, [page]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !target || !page) return;

    container.querySelectorAll("span.cited").forEach((el) => {
      el.replaceWith(document.createTextNode(el.textContent ?? ""));
    });
    container.normalize();

    const t = window.setTimeout(() => {
      if (target.quote) {
        const mark = highlightQuote(container, target.quote);
        if (mark) return scrollContainerTo(container, mark);
      }
      if (target.headingId) {
        const el = container.querySelector<HTMLElement>(`#${CSS.escape(target.headingId)}`);
        if (el) return scrollContainerTo(container, el);
      }
      container.scrollTop = 0;
    }, 80);
    return () => window.clearTimeout(t);
  }, [target, page]);

  if (!page) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 text-[color:var(--color-ink-soft)]">
        <div className="text-5xl mb-4">📚</div>
        <p className="font-display font-semibold text-lg text-[color:var(--color-ink)]">Nessuna pagina aperta</p>
        <p className="text-sm mt-1 max-w-xs">
          Fai una domanda e clicca su una citazione per aprire qui la pagina wiki con la porzione evidenziata.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
        <div className="text-xs uppercase tracking-widest text-[color:var(--color-ink-soft)] flex items-center gap-2">
          {page.category && page.category !== "Generale" && (
            <>
              <span>{page.category}</span>
              <span className="text-[color:var(--color-faint)]">·</span>
            </>
          )}
          <span>{TYPE_LABEL[page.type] ?? page.type}</span>
        </div>
        <h2 className="font-display font-bold text-xl mt-1">{page.title}</h2>
        {toc.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {toc.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  const c = containerRef.current;
                  const el = c?.querySelector<HTMLElement>(`#${CSS.escape(s.id)}`);
                  if (c && el) scrollContainerTo(c, el);
                }}
                className="text-xs rounded-full px-2.5 py-1 bg-[color:var(--color-wash-blue)] hover:bg-[color:var(--color-accent-blue)] hover:text-white transition-colors"
              >
                {s.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <motion.div
        key={page.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        ref={containerRef}
        className="prose-wiki relative flex-1 overflow-y-auto px-6 py-5"
      >
        <Markdown content={page.markdown} onWikiLink={onWikiLink} />
      </motion.div>
    </div>
  );
}
