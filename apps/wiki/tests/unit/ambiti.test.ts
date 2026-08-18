import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { listUsecases } from "@/lib/usecases";
import { getGraph, getPage } from "@/lib/graph";
import { retrieve } from "@/lib/retrieval";
import { enrichCitations } from "@/lib/citations";
import { WIKI_ROOT, contentDir, normalize, rawFiles, readAllegato, verticaleByName } from "../allegato";

// Derivati dalla spec 151 (Comportamento atteso B1-B10 + Constraint).
// Oracolo: l'allegato del ticket, non i contenuti esistenti.
//
// CONTRATTO B5 (mappa voce -> classificazione, unica fonte di verita' per vetrina e test).
// La mappa vive nel registry (decisione Gate 1, D7): ogni use-case di `lib/usecases.ts`
// espone `topics`, una voce per OGNI voce dell'elenco del proprio verticale:
//
//   topics: Array<{
//     label: string;                     // etichetta della voce, verbatim dall'allegato
//     covered: boolean;                  // true = voce marcata `X` => consultabile
//     kind?: "document" | "capability";  // default "document"; "capability" solo per D2
//     pages?: string[];                  // id dei nodi del grafo dedicati alla voce (solo covered)
//     raw?: string | null;               // documento sorgente, path relativo a content/<slug>/
//   }>

interface Topic {
  label: string;
  covered: boolean;
  kind?: "document" | "capability";
  pages?: string[];
  raw?: string | null;
}

function topicsOf(uc: { slug: string }): Topic[] {
  const t = (uc as unknown as { topics?: Topic[] }).topics;
  return Array.isArray(t) ? t : [];
}

/** Voci consultabili che devono avere documento + pagina (le capability di D2 sono escluse). */
function documentTopics(uc: { slug: string }): Topic[] {
  return topicsOf(uc).filter((t) => t.covered && t.kind !== "capability");
}

const usecases = listUsecases();

describe("oracolo — allegato del ticket 151", () => {
  it("l'allegato e' leggibile e definisce 3 verticali con 11 voci marcate X", () => {
    const verticali = readAllegato();
    expect(verticali.map((v) => v.name)).toHaveLength(3);
    for (const v of verticali) expect(v.voci.length, `voci di ${v.name}`).toBeGreaterThan(0);
    const x = verticali.reduce((n, v) => n + v.voci.filter((o) => o.covered).length, 0);
    expect(x, "voci marcate X totali").toBe(11);
  });
});

describe("B1 — biiezione verticale <-> azienda", () => {
  it("il registry espone esattamente 3 aziende", () => {
    expect(usecases).toHaveLength(3);
  });

  it("i vertical del registry coprono i 3 verticali dell'allegato, senza duplicati", () => {
    const attesi = readAllegato().map((v) => normalize(v.name));
    const dichiarati = usecases.map((u) => normalize(u.vertical));
    expect(new Set(dichiarati).size, "verticali duplicati nel registry").toBe(dichiarati.length);
    expect([...dichiarati].sort()).toEqual([...attesi].sort());
  });
});

describe("B5 — mappa voce -> classificazione esplicita", () => {
  it("ogni azienda espone una mappa non vuota", () => {
    for (const uc of usecases) {
      expect(topicsOf(uc).length, `mappa degli ambiti di ${uc.slug} (campo 'topics')`).toBeGreaterThan(0);
    }
  });

  it("la mappa copre TUTTE e SOLE le voci del verticale dell'azienda", () => {
    for (const uc of usecases) {
      const verticale = verticaleByName(uc.vertical);
      expect(verticale, `verticale '${uc.vertical}' di ${uc.slug} presente nell'allegato`).toBeDefined();

      const attese = verticale!.voci.map((v) => normalize(v.label));
      const mappate = topicsOf(uc).map((t) => normalize(t.label ?? ""));
      expect(new Set(mappate).size, `voci duplicate nella mappa di ${uc.slug}`).toBe(mappate.length);
      expect([...mappate].sort(), `mappa di ${uc.slug} vs allegato`).toEqual([...attese].sort());
    }
  });

  it("la classificazione consultabile/menzionata coincide con la marcatura X dell'allegato", () => {
    for (const uc of usecases) {
      const verticale = verticaleByName(uc.vertical)!;
      for (const voce of verticale.voci) {
        const t = topicsOf(uc).find((x) => normalize(x.label ?? "") === normalize(voce.label));
        expect(t, `voce '${voce.label}' nella mappa di ${uc.slug}`).toBeDefined();
        expect(t!.covered, `'${voce.label}' (${uc.slug}) deve essere ${voce.covered ? "consultabile" : "solo menzionata"}`).toBe(voce.covered);
      }
    }
  });
});

describe("B2 — copertura delle voci X", () => {
  it("ogni voce X ha un documento sorgente dedicato in content/<slug>/raw/", () => {
    for (const uc of usecases) {
      expect(documentTopics(uc).length, `voci consultabili nella mappa di ${uc.slug}`).toBeGreaterThan(0);
      for (const t of documentTopics(uc)) {
        expect(typeof t.raw, `raw della voce '${t.label}' (${uc.slug})`).toBe("string");
        const file = path.resolve(contentDir(uc.slug), t.raw!);
        expect(existsSync(file), `documento sorgente '${t.raw}' della voce '${t.label}' (${uc.slug})`).toBe(true);
      }
    }
  });

  it("ogni voce X ha almeno un nodo del grafo dedicato, di cui almeno uno di type 'source'", () => {
    for (const uc of usecases) {
      for (const t of documentTopics(uc)) {
        const ids = t.pages ?? [];
        expect(ids.length, `pagine dedicate alla voce '${t.label}' (${uc.slug})`).toBeGreaterThan(0);
        for (const id of ids) {
          expect(getPage(uc.slug, id), `pagina '${id}' della voce '${t.label}' nel grafo di ${uc.slug}`).toBeDefined();
        }
        const tipi = ids.map((id) => getPage(uc.slug, id)?.type);
        expect(tipi, `la voce '${t.label}' (${uc.slug}) deve avere la sua pagina-documento (sources/)`).toContain("source");
      }
    }
  });

  it("nessuna voce X condivide documento o pagina con un'altra voce (1 documento per voce, D5)", () => {
    for (const uc of usecases) {
      const raws = documentTopics(uc).map((t) => path.basename(t.raw ?? ""));
      expect(new Set(raws).size, `documenti raw/ riusati tra voci diverse in ${uc.slug}`).toBe(raws.length);
      const pagine = documentTopics(uc).flatMap((t) => t.pages ?? []);
      expect(new Set(pagine).size, `pagine rivendicate da piu' voci in ${uc.slug}`).toBe(pagine.length);
    }
  });

  it("l'unica voce X senza documento e' la capability di ricerca semantica (D2)", () => {
    const capability = usecases.flatMap((uc) => topicsOf(uc).filter((t) => t.kind === "capability"));
    expect(capability.length, "voci dichiarate 'capability'").toBeLessThanOrEqual(1);
    for (const t of capability) {
      expect(t.covered, `la capability '${t.label}' e' un ambito trattato`).toBe(true);
      expect(normalize(t.label)).toMatch(/ricerca semantica/);
    }
  });
});

describe("B3 — consultabilita' effettiva delle voci X", () => {
  it("una domanda che nomina la voce recupera una delle sue pagine dedicate", () => {
    for (const uc of usecases) {
      expect(documentTopics(uc).length, `voci consultabili nella mappa di ${uc.slug}`).toBeGreaterThan(0);
      for (const t of documentTopics(uc)) {
        const dedicate = new Set(t.pages ?? []);
        // pagine d'ingresso del retrieval (expand=0: nessuna espansione sul grafo)
        const trovate = retrieve(uc.slug, `Avete ${t.label}?`, 5, 0).map((r) => r.page.id);
        expect(
          trovate.some((id) => dedicate.has(id)),
          `retrieve('${uc.slug}', "Avete ${t.label}?") -> [${trovate.join(", ")}] non contiene nessuna delle pagine dedicate [${[...dedicate].join(", ")}]`,
        ).toBe(true);
      }
    }
  });

  it("le pagine dedicate a una voce X sono citabili (id valido nel grafo di quello slug)", () => {
    for (const uc of usecases) {
      for (const t of documentTopics(uc)) {
        for (const id of t.pages ?? []) {
          const citazioni = enrichCitations(uc.slug, [{ pageId: id, quote: "" }]);
          expect(citazioni.map((c) => c.pageId), `citazione di '${id}' in ${uc.slug}`).toEqual([id]);
        }
      }
    }
  });
});

describe("B4 — voci senza X = sola menzione", () => {
  it("nessuna voce senza X rivendica documenti o pagine dedicate", () => {
    for (const uc of usecases) {
      for (const t of topicsOf(uc).filter((x) => !x.covered)) {
        expect(t.raw ?? null, `la voce senza X '${t.label}' (${uc.slug}) non deve avere un documento raw/`).toBeNull();
        expect(t.pages ?? [], `la voce senza X '${t.label}' (${uc.slug}) non deve avere pagine dedicate`).toEqual([]);
      }
    }
  });

  it("ogni documento in content/<slug>/raw/ appartiene a una voce X (nessun documento su voce senza X)", () => {
    for (const uc of usecases) {
      const rivendicati = new Set(documentTopics(uc).map((t) => path.basename(t.raw ?? "")));
      const suDisco = rawFiles(uc.slug);
      expect(suDisco.length, `documenti in content/${uc.slug}/raw/`).toBeGreaterThan(0);
      const orfani = suDisco.filter((f) => !rivendicati.has(f));
      expect(orfani, `documenti di ${uc.slug} non riconducibili a una voce X`).toEqual([]);
    }
  });

  it("ogni pagina-documento (type 'source') del grafo appartiene a una voce X", () => {
    for (const uc of usecases) {
      const rivendicate = new Set(documentTopics(uc).flatMap((t) => t.pages ?? []));
      const sources = getGraph(uc.slug).pages.filter((p) => p.type === "source").map((p) => p.id);
      const orfane = sources.filter((id) => !rivendicate.has(id));
      expect(orfane, `pagine sources/ di ${uc.slug} non riconducibili a una voce X`).toEqual([]);
    }
  });

  it("nessun nodo del grafo e' intitolato a una voce senza X", () => {
    for (const uc of usecases) {
      const menzionate = new Set(topicsOf(uc).filter((t) => !t.covered).map((t) => normalize(t.label)));
      for (const p of getGraph(uc.slug).pages) {
        expect(
          menzionate.has(normalize(p.title)),
          `la pagina '${p.id}' di ${uc.slug} e' intitolata alla voce senza X '${p.title}'`,
        ).toBe(false);
      }
    }
  });
});

describe("B6 — segregazione per-slug della mappa", () => {
  it("le pagine rivendicate da un'azienda non esistono nel grafo di un'altra", () => {
    for (const uc of usecases) {
      const rivendicate = documentTopics(uc).flatMap((t) => t.pages ?? []);
      for (const altra of usecases.filter((u) => u.slug !== uc.slug)) {
        for (const id of rivendicate) {
          expect(getPage(altra.slug, id), `pagina '${id}' di ${uc.slug} non deve esistere in ${altra.slug}`).toBeUndefined();
        }
      }
    }
  });

  it("i documenti rivendicati stanno dentro content/<slug>/raw/", () => {
    for (const uc of usecases) {
      const base = path.resolve(contentDir(uc.slug), "raw");
      for (const t of documentTopics(uc)) {
        const file = path.resolve(contentDir(uc.slug), t.raw ?? "");
        expect(file.startsWith(base + path.sep), `'${t.raw}' (${uc.slug}) deve stare in content/${uc.slug}/raw/`).toBe(true);
      }
    }
  });
});

describe("B9 — registry coerente con i contenuti", () => {
  it("ogni suggestion mostrata nella chat vuota trova risposta nei contenuti della sua azienda", () => {
    for (const uc of usecases) {
      expect(uc.suggestions.length, `suggestions di ${uc.slug}`).toBeGreaterThan(0);
      for (const s of uc.suggestions) {
        const hit = retrieve(uc.slug, s, 4, 0);
        expect(hit.length, `la suggestion "${s}" di ${uc.slug} non recupera nessuna pagina`).toBeGreaterThan(0);
      }
    }
  });
});

describe("B10 — nessuna pipeline LLM", () => {
  it("scripts/wiki-graph.ts non contiene chiamate a un LLM", () => {
    const src = readFileSync(path.join(WIKI_ROOT, "scripts", "wiki-graph.ts"), "utf8");
    expect(src).not.toMatch(/openai|openrouter|anthropic|completions/i);
  });

  it("i graph.json restano artefatti gitignored", () => {
    for (const uc of usecases) {
      const rel = path.join("content", uc.slug, "graph.json");
      let ignorato = true;
      try {
        execFileSync("git", ["check-ignore", "-q", rel], { cwd: WIKI_ROOT });
      } catch {
        ignorato = false;
      }
      expect(ignorato, `${rel} deve essere gitignored`).toBe(true);
    }
  });
});
