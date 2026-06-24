// Accesso al wiki generato (content/graph.json) a runtime.
import graphJson from "@/content/graph.json";
import type { ClientGraph, WikiGraph, WikiPage } from "./types";

export const graph = graphJson as unknown as WikiGraph;

export const pagesById: Map<string, WikiPage> = new Map(graph.pages.map((p) => [p.id, p]));

// adiacenze non orientate (per "pagine collegate" e vista a grafo)
const neighbors = new Map<string, Set<string>>();
for (const e of graph.edges) {
  if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
  if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
  neighbors.get(e.source)!.add(e.target);
  neighbors.get(e.target)!.add(e.source);
}

export function getRelatedPages(pageId: string): WikiPage[] {
  const ns = neighbors.get(pageId);
  if (!ns) return [];
  return [...ns].map((id) => pagesById.get(id)).filter((p): p is WikiPage => Boolean(p));
}

export function getPage(id: string): WikiPage | undefined {
  return pagesById.get(id);
}

export function getClientGraph(): ClientGraph {
  return {
    pages: graph.pages,
    edges: graph.edges,
    categories: [...new Set(graph.pages.map((p) => p.category))].sort(),
  };
}
