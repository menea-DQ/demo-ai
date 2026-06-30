import { describe, it, expect } from "vitest";
import { listUsecases } from "@/lib/usecases";
import { getGraph } from "@/lib/graph";
import { retrieve } from "@/lib/retrieval";

// B3 — INVARIANTE CHIAVE (spec 262): il retrieval di un'azienda non attinge MAI ai
// contenuti di un'altra azienda. Test agnostico al numero/nome aziende: prende tutte
// le coppie da listUsecases().

const QUESTIONS = [
  "Come funziona il processo?",
  "Quali sono le procedure di sicurezza?",
  "Chi sono i responsabili e i fornitori?",
  "Spiegami i concetti principali e le entita coinvolte.",
];

describe("retrieval segregato per azienda (@/lib/retrieval)", () => {
  it("retrieve(slug, q) ritorna solo pagine esistenti nel grafo di quello slug", () => {
    for (const uc of listUsecases()) {
      const ownIds = new Set(getGraph(uc.slug).pages.map((p) => p.id));
      for (const q of QUESTIONS) {
        for (const r of retrieve(uc.slug, q)) {
          expect(r.page).toBeTypeOf("object");
          expect(ownIds.has(r.page.id), `pagina '${r.page.id}' deve essere di ${uc.slug}`).toBe(true);
        }
      }
    }
  });

  it("B3 — una pagina che esiste SOLO in slugY non e' recuperabile in slugX", () => {
    const all = listUsecases();
    expect(all.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < all.length; i++) {
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        const slugX = all[i].slug;
        const slugY = all[j].slug;
        const xIds = new Set(getGraph(slugX).pages.map((p) => p.id));
        // pagine presenti SOLO in Y (non condivise per id con X)
        const onlyInY = getGraph(slugY).pages.filter((p) => !xIds.has(p.id));
        // ci deve essere almeno una pagina esclusiva di Y, altrimenti gli id collidono tra aziende
        expect(onlyInY.length, `${slugY} deve avere pagine non presenti in ${slugX}`).toBeGreaterThan(0);

        const onlyInYIds = new Set(onlyInY.map((p) => p.id));
        for (const q of QUESTIONS) {
          for (const r of retrieve(slugX, q)) {
            expect(
              onlyInYIds.has(r.page.id),
              `retrieve('${slugX}') NON deve restituire la pagina '${r.page.id}' esclusiva di '${slugY}'`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it("rispetta topK quando passato", () => {
    const slug = listUsecases()[0].slug;
    const res = retrieve(slug, QUESTIONS[0], 2, 0);
    expect(res.length).toBeLessThanOrEqual(2);
  });
});
