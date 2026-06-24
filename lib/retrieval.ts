// Retrieval in stile LLM Wiki: seleziona le pagine d'ingresso per rilevanza lessicale (BM25)
// e poi ESPANDE seguendo i collegamenti del wiki (le pagine sono già pre-sintetizzate).
import { graph, getRelatedPages } from "./graph";
import type { WikiPage } from "./types";

const STOPWORDS = new Set(
  "il lo la i gli le un uno una di a da in con su per tra fra del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle sul sullo sulla sui sugli sulle e ed o od ma se che chi cui non come dove quando perche piu meno molto poco questo questa questi queste quello quella si no e sono essere ha hanno fare cosa quali quale".split(
    /\s+/
  )
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

const N = Math.max(1, graph.pages.length);
const df = new Map<string, number>();
const pageTokens = new Map<string, string[]>();

for (const p of graph.pages) {
  // titolo e tag pesano di più (ripetuti)
  const tokens = tokenize(`${p.title} ${p.title} ${p.tags.join(" ")} ${p.tags.join(" ")} ${p.summary} ${p.markdown}`);
  pageTokens.set(p.id, tokens);
  for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
}

function idf(term: string): number {
  const d = df.get(term) ?? 0;
  return Math.log(1 + (N - d + 0.5) / (d + 0.5));
}

const K1 = 1.5;
const B = 0.75;
const avgLen = [...pageTokens.values()].reduce((a, t) => a + t.length, 0) / N;

function bm25(queryTerms: string[], page: WikiPage): number {
  const tokens = pageTokens.get(page.id) ?? [];
  if (!tokens.length) return 0;
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const len = tokens.length;
  let score = 0;
  for (const q of queryTerms) {
    const f = tf.get(q);
    if (!f) continue;
    score += idf(q) * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / avgLen))));
  }
  return score;
}

export interface RetrievedPage {
  page: WikiPage;
  score: number;
  viaGraph: boolean;
}

/** Pagine candidate per la domanda: top-K per rilevanza + vicini sul grafo. */
export function retrieve(query: string, topK = 4, expand = 2): RetrievedPage[] {
  const terms = tokenize(query);
  if (!terms.length) return [];

  const scored = graph.pages
    .map((page) => ({ page, score: bm25(terms, page), viaGraph: false }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK);
  const chosen = new Map<string, RetrievedPage>();
  for (const r of top) chosen.set(r.page.id, r);

  // espansione: segui i collegamenti del wiki dalle pagine più rilevanti
  for (const r of top.slice(0, expand)) {
    for (const nb of getRelatedPages(r.page.id)) {
      if (chosen.has(nb.id)) continue;
      chosen.set(nb.id, { page: nb, score: bm25(terms, nb), viaGraph: true });
    }
  }

  return [...chosen.values()].sort((a, b) => b.score - a.score);
}
