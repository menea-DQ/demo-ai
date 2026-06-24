import Link from "next/link";
import { graph } from "@/lib/graph";

export default function Home() {
  const docCount = graph.pages.length;
  const linkCount = graph.edges.length;

  const features = [
    {
      icon: "💬",
      title: "Chiedi in linguaggio naturale",
      body: "Fai domande sulla documentazione aziendale come parleresti a un collega esperto.",
    },
    {
      icon: "🎯",
      title: "Fonti sempre verificabili",
      body: "Ogni risposta mostra il documento e la porzione esatta da cui proviene l'informazione.",
    },
    {
      icon: "🕸️",
      title: "Naviga i collegamenti",
      body: "Dalla risposta salti a sezioni correlate e esplori il knowledge graph dell'azienda.",
    },
  ];

  return (
    <main className="aurora-bg min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <div className="font-display text-lg font-extrabold tracking-tight">
          Aurora<span className="text-[color:var(--color-faint)]">Wiki</span>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-ink-soft)]">
          powered by <span className="font-semibold text-[color:var(--color-ink)]">Donq</span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col justify-center py-16">
        <div className="inline-flex items-center gap-2 self-start rounded-full glass px-4 py-1.5 text-xs font-medium text-[color:var(--color-ink-soft)] mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-blue)] animate-pulse" />
          Demo interattiva · Knowledge AI documentale
        </div>

        <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[0.98] text-5xl sm:text-6xl md:text-7xl max-w-4xl">
          La conoscenza della tua azienda,
          <br />
          <span className="bg-gradient-to-r from-[color:var(--color-accent-rose)] via-[color:var(--color-accent-blue)] to-[color:var(--color-accent-cyan)] bg-clip-text text-transparent">
            viva e navigabile.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-[color:var(--color-ink-soft)] max-w-2xl leading-relaxed">
          Trasforma manuali, procedure e policy in una <strong className="text-[color:var(--color-ink)]">wiki conversazionale</strong>.
          Chatti, ottieni risposte con le fonti citate e navighi tra i documenti collegati. Questa demo
          usa la knowledge base di una PMI manifatturiera di esempio.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/wiki"
            className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--color-night)] text-[color:var(--color-paper)] px-7 py-3.5 text-base font-semibold transition-transform hover:scale-[1.03] active:scale-95"
          >
            Avvia la demo
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <a
            href="https://donq.io/contacts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass px-7 py-3.5 text-base font-semibold hover:bg-white transition-colors"
          >
            Parla con noi
          </a>
        </div>

        <div className="mt-10 flex flex-wrap gap-6 text-sm text-[color:var(--color-ink-soft)]">
          <span><strong className="text-[color:var(--color-ink)]">{docCount}</strong> documenti</span>
          <span className="text-[color:var(--color-faint)]">·</span>
          <span><strong className="text-[color:var(--color-ink)]">{linkCount}</strong> collegamenti</span>
          <span className="text-[color:var(--color-faint)]">·</span>
          <span>Risposte con <strong className="text-[color:var(--color-ink)]">fonti citate</strong></span>
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-20 grid gap-5 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-display font-semibold text-lg mb-1.5">{f.title}</h3>
            <p className="text-sm text-[color:var(--color-ink-soft)] leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="w-full max-w-6xl mx-auto px-6 py-8 text-xs text-[color:var(--color-ink-soft)] border-t border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
        Demo realizzata da Donq · I dati di "Officine Meccaniche Aurora S.r.l." sono inventati a scopo dimostrativo.
      </footer>
    </main>
  );
}
