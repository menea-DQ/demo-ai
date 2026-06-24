"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/slug";

/** Converte i wikilink `[[target|label]]` in link markdown `wiki:target`. */
function preprocess(md: string): string {
  return md.replace(
    /\[\[([^\]|#]+(?:#[^\]|]+)?)(?:\|([^\]]+))?\]\]/g,
    (_m, target: string, label?: string) => `[${label ?? target}](wiki:${target})`
  );
}

function nodeText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (React.isValidElement(children)) {
    return nodeText((children.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export default function Markdown({
  content,
  onWikiLink,
}: {
  content: string;
  onWikiLink?: (target: string) => void;
}) {
  const processed = useMemo(() => preprocess(content), [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      // Sanitizzazione URL: preserva lo schema custom `wiki:`, consente solo schemi sicuri
      // (http/https/mailto/tel, link relativi/anchor) e BLOCCA javascript:/data: ecc. (anti-XSS).
      urlTransform={(url) =>
        url.startsWith("wiki:") ? url : /^(https?:|mailto:|tel:|\/|#|\.)/i.test(url) ? url : ""
      }
      components={{
        a({ href, children }) {
          if (href && href.startsWith("wiki:")) {
            const target = href.slice("wiki:".length);
            return (
              <span
                role="link"
                tabIndex={0}
                className="wikilink"
                onClick={() => onWikiLink?.(target)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onWikiLink?.(target);
                }}
              >
                {children}
              </span>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
              {children}
            </a>
          );
        },
        h1({ children }) {
          return <h1 id={slugify(nodeText(children))}>{children}</h1>;
        },
        h2({ children }) {
          return <h2 id={slugify(nodeText(children))}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 id={slugify(nodeText(children))}>{children}</h3>;
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}
