// Tipi condivisi - modello "LLM Wiki" (pagine interconnesse).

export type PageType = "source" | "concept" | "entity";

export interface WikiPage {
  id: string;
  type: PageType;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  /** markdown della pagina (con wikilink [[id|testo]]) */
  markdown: string;
  /** id delle pagine collegate (uscenti, già validate) */
  links: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface WikiGraph {
  generatedAt: string;
  pages: WikiPage[];
  edges: GraphEdge[];
  warnings: string[];
}

/** Payload serializzabile per i client component (include il markdown per il viewer). */
export interface ClientGraph {
  pages: WikiPage[];
  edges: GraphEdge[];
  categories: string[];
}

/** Citazione restituita dal modello e validata server-side. */
export interface Citation {
  pageId: string;
  title: string;
  category: string;
  type: PageType;
  /** estratto verbatim da evidenziare nella pagina */
  quote: string;
}

/** Riferimento a una pagina collegata (navigazione "continua a esplorare"). */
export interface RelatedRef {
  pageId: string;
  title: string;
  category: string;
  type: PageType;
}
