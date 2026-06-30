// Accesso ai wiki generati (content/<slug>/graph.json) a runtime, per azienda.
// Import statici: una voce per ogni use-case del registry (aggiungere un'azienda =
// una riga qui + la sua cartella content/<slug>/). I derivati (lookup, adiacenze)
// sono memoizzati per slug così da non ricostruirli a ogni richiesta.
import auroraGraph from "@/content/aurora/graph.json";
import borealisGraph from "@/content/borealis/graph.json";
import meridianGraph from "@/content/meridian/graph.json";
import type { ClientGraph, WikiGraph, WikiPage } from "./types";

const GRAPHS: Record<string, WikiGraph> = {
  aurora: auroraGraph as unknown as WikiGraph,
  borealis: borealisGraph as unknown as WikiGraph,
  meridian: meridianGraph as unknown as WikiGraph,
};

const EMPTY: WikiGraph = { generatedAt: "", pages: [], edges: [], warnings: [] };

interface Derived {
  graph: WikiGraph;
  pagesById: Map<string, WikiPage>;
  neighbors: Map<string, Set<string>>;
}

const cache = new Map<string, Derived>();

function derived(slug: string): Derived {
  const hit = cache.get(slug);
  if (hit) return hit;

  const graph = GRAPHS[slug] ?? EMPTY;
  const pagesById = new Map(graph.pages.map((p) => [p.id, p]));
  const neighbors = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
    if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
    neighbors.get(e.source)!.add(e.target);
    neighbors.get(e.target)!.add(e.source);
  }
  const d: Derived = { graph, pagesById, neighbors };
  cache.set(slug, d);
  return d;
}

export function getGraph(slug: string): WikiGraph {
  return derived(slug).graph;
}

export function getRelatedPages(slug: string, pageId: string): WikiPage[] {
  const { neighbors, pagesById } = derived(slug);
  const ns = neighbors.get(pageId);
  if (!ns) return [];
  return [...ns].map((id) => pagesById.get(id)).filter((p): p is WikiPage => Boolean(p));
}

export function getPage(slug: string, id: string): WikiPage | undefined {
  return derived(slug).pagesById.get(id);
}

export function getClientGraph(slug: string): ClientGraph {
  const { graph } = derived(slug);
  return {
    pages: graph.pages,
    edges: graph.edges,
    categories: [...new Set(graph.pages.map((p) => p.category))].sort(),
  };
}
