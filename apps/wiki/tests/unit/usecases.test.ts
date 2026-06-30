import { describe, it, expect } from "vitest";
import { listUsecases, getUsecase } from "@/lib/usecases";

// Derivati dalla spec 262 (B4, B5). Agnostici al numero di aziende: si itera su listUsecases().
// L'unico slug citato esplicitamente dalla spec e' "aurora" (manifatturiero esistente).

describe("registry use-case (@/lib/usecases)", () => {
  it("listUsecases() ritorna almeno 3 aziende (spec: '≥3')", () => {
    const all = listUsecases();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(3);
  });

  it("ogni use-case espone il contratto completo (slug, companyName, vertical, tagline, assistantName, xTitle, colors)", () => {
    for (const uc of listUsecases()) {
      expect(typeof uc.slug).toBe("string");
      expect(uc.slug.length).toBeGreaterThan(0);
      expect(typeof uc.companyName).toBe("string");
      expect(uc.companyName.length).toBeGreaterThan(0);
      expect(typeof uc.vertical).toBe("string");
      expect(uc.vertical.length).toBeGreaterThan(0);
      expect(typeof uc.tagline).toBe("string");
      expect(typeof uc.assistantName).toBe("string");
      expect(uc.assistantName.length).toBeGreaterThan(0);
      expect(typeof uc.xTitle).toBe("string");
      expect(uc.colors).toBeTypeOf("object");
      expect(uc.colors).not.toBeNull();
      expect(Object.keys(uc.colors).length).toBeGreaterThan(0);
    }
  });

  it("gli slug sono univoci", () => {
    const slugs = listUsecases().map((u) => u.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("getUsecase(slug) ritorna l'azienda per ogni slug del registry", () => {
    for (const uc of listUsecases()) {
      expect(getUsecase(uc.slug)).toEqual(uc);
    }
  });

  it("getUsecase(slug-inesistente) ritorna undefined", () => {
    expect(getUsecase("slug-che-non-esiste-mai-xyz")).toBeUndefined();
  });

  it("B5 — registry unica fonte: lo slug 'aurora' (manifatturiero) esiste", () => {
    expect(getUsecase("aurora")).toBeDefined();
  });

  it("B5 — per uno use-case != aurora, companyName e assistantName NON sono il letterale 'Aurora'", () => {
    const others = listUsecases().filter((u) => u.slug !== "aurora");
    expect(others.length).toBeGreaterThan(0);
    for (const uc of others) {
      expect(uc.companyName).not.toMatch(/aurora/i);
      expect(uc.assistantName).not.toMatch(/aurora/i);
    }
  });

  it("B4 — due aziende qualsiasi espongono palette DISTINTE (colors differiscono)", () => {
    const all = listUsecases();
    // Almeno una coppia deve differire; agnostico: confronto tutte le coppie e ne esige >=1 diversa.
    let foundDistinctPair = false;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (JSON.stringify(all[i].colors) !== JSON.stringify(all[j].colors)) {
          foundDistinctPair = true;
        }
      }
    }
    expect(foundDistinctPair).toBe(true);
  });

  it("constraint — xTitle e' ASCII puro (header HTTP solo ASCII)", () => {
    // eslint-disable-next-line no-control-regex
    const asciiOnly = /^[\x00-\x7F]*$/;
    for (const uc of listUsecases()) {
      expect(asciiOnly.test(uc.xTitle)).toBe(true);
    }
  });
});
