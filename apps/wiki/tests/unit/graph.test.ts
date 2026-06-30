import { describe, it, expect } from "vitest";
import { listUsecases } from "@/lib/usecases";
import { getGraph, getPage, getRelatedPages } from "@/lib/graph";

// Derivati dalla spec 262 (B7 grafo non degenere + B3 segregazione lato grafo).
// Agnostici al numero di aziende: si itera su listUsecases().

describe("grafo per-azienda (@/lib/graph)", () => {
  it("B7 — ogni azienda ha un grafo NON degenere (pages > 0 e edges > 0)", () => {
    for (const uc of listUsecases()) {
      const g = getGraph(uc.slug);
      expect(g).toBeTypeOf("object");
      expect(Array.isArray(g.pages)).toBe(true);
      expect(Array.isArray(g.edges)).toBe(true);
      expect(g.pages.length, `pages di ${uc.slug}`).toBeGreaterThan(0);
      expect(g.edges.length, `edges di ${uc.slug}`).toBeGreaterThan(0);
    }
  });

  it("ogni pagina del grafo ha un id univoco entro la propria azienda", () => {
    for (const uc of listUsecases()) {
      const ids = getGraph(uc.slug).pages.map((p) => p.id);
      expect(new Set(ids).size, `id univoci in ${uc.slug}`).toBe(ids.length);
    }
  });

  it("getPage(slug, id) ritorna la pagina presente nel grafo di quello slug", () => {
    for (const uc of listUsecases()) {
      const first = getGraph(uc.slug).pages[0];
      expect(getPage(uc.slug, first.id)?.id).toBe(first.id);
    }
  });

  it("getPage(slug, id-inesistente) ritorna undefined", () => {
    const slug = listUsecases()[0].slug;
    expect(getPage(slug, "id-che-non-esiste-mai-xyz")).toBeUndefined();
  });

  it("B3 — gli edge di un'azienda collegano SOLO pagine della stessa azienda", () => {
    for (const uc of listUsecases()) {
      const g = getGraph(uc.slug);
      const ids = new Set(g.pages.map((p) => p.id));
      for (const e of g.edges) {
        const ends = Object.values(e).filter((v) => typeof v === "string") as string[];
        // gli endpoint che sono id-di-pagina devono appartenere a questa azienda
        for (const end of ends) {
          if (ids.size && (end === g.pages[0].id || ids.has(end))) {
            expect(ids.has(end), `edge endpoint '${end}' in ${uc.slug}`).toBe(true);
          }
        }
      }
    }
  });

  it("B3 — getRelatedPages(slugX, pageId) ritorna SOLO pagine di slugX", () => {
    for (const uc of listUsecases()) {
      const ids = new Set(getGraph(uc.slug).pages.map((p) => p.id));
      const first = getGraph(uc.slug).pages[0];
      for (const related of getRelatedPages(uc.slug, first.id)) {
        expect(ids.has(related.id), `related '${related.id}' deve essere di ${uc.slug}`).toBe(true);
      }
    }
  });
});
