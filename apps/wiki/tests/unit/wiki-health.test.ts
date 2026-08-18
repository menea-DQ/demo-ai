import { describe, it, expect } from "vitest";
import { listUsecases } from "@/lib/usecases";
import { getGraph } from "@/lib/graph";

// Derivati dalla spec 151, B7 (salute del wiki invariata) e B8 (profondita' comparabile).
// Sono invarianti di regressione: il ribilanciamento dei contenuti (D3) non deve degradarli.

const usecases = listUsecases();
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("B7 — salute del wiki dopo il ribilanciamento", () => {
  it("0 link non risolti: ogni link uscente punta a una pagina della stessa azienda", () => {
    for (const uc of usecases) {
      const g = getGraph(uc.slug);
      const ids = new Set(g.pages.map((p) => p.id));
      const rotti = g.pages.flatMap((p) => p.links.filter((l) => !ids.has(l)).map((l) => `${p.id} -> ${l}`));
      expect(rotti, `link non risolti in ${uc.slug}`).toEqual([]);
    }
  });

  it("0 link non risolti segnalati dal generatore (warnings del grafo vuoti)", () => {
    for (const uc of usecases) {
      expect(getGraph(uc.slug).warnings, `warnings del grafo di ${uc.slug}`).toEqual([]);
    }
  });

  it("0 pagine orfane: ogni pagina compare in almeno un arco", () => {
    for (const uc of usecases) {
      const g = getGraph(uc.slug);
      const collegate = new Set(g.edges.flatMap((e) => [e.source, e.target]));
      const orfane = g.pages.filter((p) => !collegate.has(p.id)).map((p) => p.id);
      expect(orfane, `pagine orfane in ${uc.slug}`).toEqual([]);
    }
  });

  it("ogni pagina ha almeno 2 link uscenti", () => {
    for (const uc of usecases) {
      const poveri = getGraph(uc.slug)
        .pages.filter((p) => p.links.length < 2)
        .map((p) => `${p.id} (${p.links.length})`);
      expect(poveri, `pagine con meno di 2 link uscenti in ${uc.slug}`).toEqual([]);
    }
  });

  it("0 summary mancanti e frontmatter minimo presente (id kebab-case, type, title, tags)", () => {
    for (const uc of usecases) {
      for (const p of getGraph(uc.slug).pages) {
        expect(KEBAB.test(p.id), `id '${p.id}' di ${uc.slug} non e' kebab-case`).toBe(true);
        expect(["source", "concept", "entity"], `type di '${p.id}' (${uc.slug})`).toContain(p.type);
        expect(p.title?.trim(), `title di '${p.id}' (${uc.slug})`).toBeTruthy();
        expect(p.summary?.trim(), `summary di '${p.id}' (${uc.slug})`).toBeTruthy();
        expect(Array.isArray(p.tags), `tags di '${p.id}' (${uc.slug})`).toBe(true);
      }
    }
  });
});

describe("B8 — profondita' comparabile tra aziende", () => {
  it("nessuna azienda scende sotto il 70% dei nodi della piu' ricca", () => {
    const conteggi = usecases.map((uc) => ({ slug: uc.slug, n: getGraph(uc.slug).pages.length }));
    const max = Math.max(...conteggi.map((c) => c.n));
    for (const c of conteggi) {
      expect(
        c.n / max,
        `${c.slug} ha ${c.n} nodi contro i ${max} della piu' ricca (${conteggi.map((x) => `${x.slug}:${x.n}`).join(", ")})`,
      ).toBeGreaterThanOrEqual(0.7);
    }
  });
});
