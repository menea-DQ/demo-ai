// Registry degli use-case (aziende) della demo Wiki — UNICA fonte di verità (spec 262, B5).
// Ogni use-case = un'azienda con nome, verticale, palette e contenuti propri.
// I `colors` sovrascrivono gli accent di globals.css (--color-accent-{rose|blue|cyan})
// applicati per-route in /wiki/[usecase]. `xTitle` è ASCII puro (header HTTP solo ASCII).
// Aggiungere un'azienda = una voce qui + cartella content/<slug>/ + import in lib/graph.ts.
// `topics` e' la mappa voce->classificazione dell'allegato al ticket 151: unica fonte di verita'
// sia per la vetrina degli ambiti in homepage sia per i test. Voce con `X` = consultabile
// (documento in raw/ + pagina nel grafo); voce senza `X` = solo menzionata.

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
  /** Mappa degli ambiti documentali del verticale (spec 151, B5). */
  topics: Topic[];
}

/**
 * Una voce dell'elenco delle tipologie documentali del verticale (allegato al ticket 151).
 * `covered` = voce marcata `X`: ha un documento sorgente e una pagina consultabile.
 * Le voci non coperte esistono solo come menzione: niente `raw`, niente `pages`.
 */
export interface Topic {
  /** Etichetta della voce, verbatim dall'allegato. */
  label: string;
  covered: boolean;
  /** "capability" = la voce non e' un documento ma qualcosa che il sistema fa. */
  kind?: "document" | "capability";
  /** Id dei nodi del grafo dedicati alla voce (solo se `covered`). */
  pages?: string[];
  /** Documento sorgente, path relativo a content/<slug>/ (solo se `covered`). */
  raw?: string | null;
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
      "Quali tolleranze ha il cuscinetto AX-6205?",
      "Come si monta un cuscinetto della linea AX?",
      "Qual è il prezzo di listino di un AX-6205?",
      "Cosa contiene una proposta tecnico-economica?",
    ],
    topics: [
      { label: "Schede tecniche di prodotto e componente", covered: true, raw: "raw/01-scheda-tecnica-cuscinetto-ax.md", pages: ["01-scheda-tecnica-prodotto"] },
      { label: "Distinte base (BOM)", covered: false },
      { label: "Disegni tecnici, tavole, file CAD", covered: false },
      { label: "Schemi elettrici, pneumatici, idraulici", covered: false },
      { label: "Manuali di montaggio, uso e manutenzione (fogli istruzione)", covered: true, raw: "raw/02-manuale-montaggio-uso-manutenzione.md", pages: ["02-manuale-montaggio-uso-manutenzione"] },
      { label: "Depliant tecnico-commerciali", covered: false },
      { label: "Regole di configurazione e varianti di prodotto", covered: false },
      { label: "Cicli di lavorazione e istruzioni operative di reparto", covered: false },
      { label: "Specifiche e capitolati cliente", covered: false },
      { label: "Storico commesse e progetti realizzati", covered: false },
      { label: "Non conformità e azioni correttive", covered: false },
      { label: "Report di collaudo e test", covered: false },
      { label: "Dichiarazioni di conformità (CE), certificazioni di prodotto, normative di settore", covered: false },
      { label: "Schede di sicurezza materiali", covered: false },
      { label: "Listini e cataloghi tecnici", covered: true, raw: "raw/03-listino-catalogo-tecnico.md", pages: ["03-listino-catalogo-tecnico"] },
      { label: "Know-how non scritto (procedure da formalizzare)", covered: false },
      { label: "Preventivi e proposte tecnico-economiche", covered: true, raw: "raw/04-preventivo-proposta.md", pages: ["04-preventivo-proposta"] },
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
      "Cosa prevede il capitolato speciale d'appalto?",
      "Quali documenti servono per qualificare un subappaltatore?",
      "Come sono organizzati gli elaborati grafici e il modello BIM?",
      "Il cappotto EPS ha la DoP e la marcatura CE?",
    ],
    topics: [
      { label: "Capitolati d'appalto e capitolati speciali", covered: true, raw: "raw/01-capitolato-appalto.md", pages: ["01-capitolato-appalto"] },
      { label: "Computo-metrici estimativi", covered: false },
      { label: "SAL (stati avanzamento lavori)", covered: false },
      { label: "DDT e bolle fornitori", covered: false },
      { label: "Qualifiche e certificazioni subappaltatori, DURC", covered: true, raw: "raw/02-qualifica-subappaltatore-durc.md", pages: ["02-qualifica-subappaltatore-durc"] },
      { label: "Varianti di progetto", covered: false },
      { label: "Elaborati grafici, tavole, modelli BIM", covered: true, raw: "raw/03-elaborati-grafici-bim.md", pages: ["03-elaborati-grafici-bim"] },
      { label: "Documentazione di sicurezza (PSC, POS, DVR)", covered: false },
      { label: "Giornale dei lavori e verbali di cantiere", covered: false },
      { label: "Schede tecniche materiali, DoP, marcatura CE", covered: true, raw: "raw/06-scheda-tecnica-dop.md", pages: ["06-scheda-tecnica-dop"] },
      { label: "Contratti e subappalti", covered: false },
      { label: "Corrispondenza di commessa (email, comunicazioni con DL - decreto legge - e committente)", covered: false },
      { label: "Collaudi, certificazioni energetiche, as-built", covered: false },
      { label: "Documentazione e allegati per gare d'appalto", covered: false },
      { label: "Normativa tecnica e regolamenti edilizi", covered: false },
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
      "Quali casi simili abbiamo già trattato?",
      "Quali checklist di compliance usiamo prima della consegna?",
      "Come si gestisce un fascicolo pratica?",
      "Che cosa contiene lo storico delle pratiche?",
    ],
    topics: [
      { label: "Ricerca Semantica su knowledge interna", covered: true, kind: "capability" },
      { label: "Pareri e relazioni tecnico-professionali", covered: false },
      { label: "Storico pratiche e casi trattati", covered: true, raw: "raw/01-storico-pratiche-archivio.md", pages: ["01-storico-pratiche-archivio"] },
      { label: "Modelli e template (contratti, perizie, relazioni)", covered: false },
      { label: "Normativa di riferimento e aggiornamenti", covered: false },
      { label: "Circolari, prassi e interpretazioni degli enti", covered: false },
      { label: "Metodologie e procedure interne di lavoro", covered: false },
      { label: "Checklist operative e di compliance", covered: true, raw: "raw/02-checklist-operative-compliance.md", pages: ["02-checklist-operative-compliance"] },
      { label: "Fascicoli pratica e documentazione cliente", covered: false },
      { label: "Corrispondenza con enti e clienti", covered: false },
      { label: "Preventivi e proposte tecnico-economiche", covered: false },
      { label: "Verbali di riunione e note interne", covered: false },
      { label: "Linee guida e standard di categoria", covered: false },
      { label: "Know-how non scritto dei senior", covered: false },
    ],
  },
];

export function listUsecases(): Usecase[] {
  return USECASES;
}

export function getUsecase(slug: string): Usecase | undefined {
  return USECASES.find((u) => u.slug === slug);
}
