// Validazione/arricchimento citazioni + calcolo pagine collegate (dal grafo del wiki).
import { getPage, getRelatedPages } from "./graph";
import type { Citation, RelatedRef, WikiPage } from "./types";

interface RawCitation {
  pageId?: string;
  quote?: string;
}

export function parseCitations(jsonText: string): RawCitation[] {
  const trimmed = jsonText.trim();
  if (!trimmed) return [];
  try {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(trimmed.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function enrichCitations(raw: RawCitation[]): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    if (!c?.pageId || seen.has(c.pageId)) continue;
    const page = getPage(c.pageId);
    if (!page) continue;
    seen.add(c.pageId);
    out.push({
      pageId: page.id,
      title: page.title,
      category: page.category,
      type: page.type,
      quote: (c.quote ?? "").slice(0, 200),
    });
  }
  return out;
}

export function relatedFromCitations(citations: Citation[]): RelatedRef[] {
  const cited = new Set(citations.map((c) => c.pageId));
  const map = new Map<string, WikiPage>();
  for (const c of citations) {
    for (const nb of getRelatedPages(c.pageId)) {
      if (cited.has(nb.id) || map.has(nb.id)) continue;
      map.set(nb.id, nb);
    }
  }
  return [...map.values()].slice(0, 8).map((p) => ({
    pageId: p.id,
    title: p.title,
    category: p.category,
    type: p.type,
  }));
}
