// Registry degli use-case (aziende) della demo Wiki — UNICA fonte di verità (spec 262, B5).
// Ogni use-case = un'azienda con nome, verticale, palette e contenuti propri.
// I `colors` sovrascrivono gli accent di globals.css (--color-accent-{rose|blue|cyan})
// applicati per-route in /wiki/[usecase]. `xTitle` è ASCII puro (header HTTP solo ASCII).
// Aggiungere un'azienda = una voce qui + cartella content/<slug>/ + import in lib/graph.ts.

export interface Usecase {
  slug: string;
  companyName: string;
  vertical: string;
  tagline: string;
  assistantName: string;
  /** Header X-Title verso OpenRouter — solo ASCII. */
  xTitle: string;
  /** Override accent della palette (chiavi = suffisso di --color-accent-*). */
  colors: { rose: string; blue: string; cyan: string };
  /** Domande di esempio mostrate nella chat vuota. */
  suggestions: string[];
}

const USECASES: Usecase[] = [
  {
    slug: "aurora",
    companyName: "Officine Meccaniche Aurora S.r.l.",
    vertical: "Manifatturiero",
    tagline: "Cuscinetti di precisione per automotive, automazione e robotica.",
    assistantName: "Aurora Assistant",
    xTitle: "Aurora Wiki - Donq",
    colors: { rose: "#e9a8ff", blue: "#8fb3ff", cyan: "#7fe7ff" },
    suggestions: [
      "Cosa fare in caso di non conformità di un cuscinetto?",
      "Quali DPI servono per il montaggio?",
      "Come si richiedono le ferie?",
      "Quando posso spedire un lotto al cliente?",
    ],
  },
  {
    slug: "borealis",
    companyName: "Borealis Costruzioni S.p.A.",
    vertical: "Edilizia, costruzioni e impiantistica",
    tagline: "Commesse edili e impiantistiche, dalla gara al collaudo.",
    assistantName: "Borealis Assistant",
    xTitle: "Borealis Wiki - Donq",
    colors: { rose: "#f0b65a", blue: "#d08456", cyan: "#8fa3b8" },
    suggestions: [
      "Cosa contiene un POS e quando serve?",
      "Come si gestisce una variante di progetto?",
      "Quali documenti servono per qualificare un subappaltatore?",
      "Come funziona un SAL?",
    ],
  },
  {
    slug: "meridian",
    companyName: "Meridian Studio Associato",
    vertical: "Servizi professionali e studi tecnici",
    tagline: "Pareri, perizie e pratiche tecniche con compliance normativa.",
    assistantName: "Meridian Assistant",
    xTitle: "Meridian Wiki - Donq",
    colors: { rose: "#5fd0a0", blue: "#3fb6b6", cyan: "#7c8cf0" },
    suggestions: [
      "Come si imposta una perizia tecnica?",
      "Quali checklist di compliance usiamo?",
      "Come si gestisce un fascicolo pratica?",
      "Dove trovo i template di relazione?",
    ],
  },
];

export function listUsecases(): Usecase[] {
  return USECASES;
}

export function getUsecase(slug: string): Usecase | undefined {
  return USECASES.find((u) => u.slug === slug);
}
