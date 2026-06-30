import Link from "next/link";
import { listUsecases } from "@/lib/usecases";

export default function Home() {
  const usecases = listUsecases();

  return (
    <main className="aurora-bg min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <div className="font-display text-lg font-extrabold tracking-tight">
          Donq<span className="text-[color:var(--color-faint)]">Wiki</span>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-ink-soft)]">
          powered by <span className="font-semibold text-[color:var(--color-ink)]">Donq</span>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-[color:var(--color-ink-soft)] mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent-blue)] animate-pulse" />
          Demo interattiva · Knowledge AI documentale
        </div>

        <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[0.98] text-5xl sm:text-6xl md:text-7xl max-w-4xl">
          La conoscenza di ogni azienda,
          <br />
          <span className="bg-gradient-to-r from-[color:var(--color-accent-rose)] via-[color:var(--color-accent-blue)] to-[color:var(--color-accent-cyan)] bg-clip-text text-transparent">
            viva e navigabile.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-[color:var(--color-ink-soft)] max-w-2xl leading-relaxed">
          Scegli un caso d&apos;uso: ogni azienda è una <strong className="text-[color:var(--color-ink)]">wiki conversazionale</strong> a
          sé, con i suoi documenti, le sue fonti citate e il suo knowledge graph.
        </p>
      </section>

      {/* Galleria use-case */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {usecases.map((u) => (
          <Link
            key={u.slug}
            href={`/wiki/${u.slug}`}
            className="group glass rounded-2xl p-6 flex flex-col transition-transform hover:-translate-y-1"
          >
            {/* swatch palette azienda (nessun testo) */}
            <div className="flex gap-1.5 mb-4" aria-hidden>
              <span className="h-3 w-3 rounded-full" style={{ background: u.colors.rose }} />
              <span className="h-3 w-3 rounded-full" style={{ background: u.colors.blue }} />
              <span className="h-3 w-3 rounded-full" style={{ background: u.colors.cyan }} />
            </div>
            <h3 className="font-display font-bold text-xl leading-tight">{u.companyName}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.15em] text-[color:var(--color-ink-soft)]">
              {u.vertical}
            </p>
            <p className="mt-3 text-sm text-[color:var(--color-ink-soft)] leading-relaxed flex-1">
              {u.tagline}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              Apri la wiki
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </section>

      <footer className="w-full max-w-6xl mx-auto px-6 py-8 mt-auto text-xs text-[color:var(--color-ink-soft)] border-t border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
        Demo realizzata da Donq · I dati delle aziende sono inventati a scopo dimostrativo.
      </footer>
    </main>
  );
}
