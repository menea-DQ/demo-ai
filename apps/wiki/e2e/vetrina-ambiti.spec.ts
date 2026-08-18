import { test, expect, type Page } from "@playwright/test";
import { normalize, readAllegato, type VerticaleAllegato } from "../tests/allegato";

// B11 (spec 151) — chi apre /wiki/<slug> vede, PRIMA di fare domande, due gruppi distinti:
// "ambiti trattati" (le voci X, consultabili) e "ambiti non coperti in questo POC" (le altre).
// Ogni voce dell'elenco dell'allegato per quel verticale compare in ESATTAMENTE uno dei due.
//
// CONTRATTO DOM (necessario per verificarlo dall'esterno):
//   [data-testid="ambiti-trattati"]      contenitore del gruppo "ambiti trattati"
//   [data-testid="ambiti-non-coperti"]   contenitore del gruppo "ambiti non coperti in questo POC"
// Le etichette sono quelle dell'allegato (mappa di B5), rese come testo dentro il gruppo.

async function slugsFromGallery(page: Page): Promise<string[]> {
  await page.goto("/");
  const links = page.locator('a[href^="/wiki/"]');
  const n = await links.count();
  const slugs: string[] = [];
  for (let i = 0; i < n; i++) {
    const href = (await links.nth(i).getAttribute("href"))!;
    const slug = href.match(/^\/wiki\/([^/?#]+)/)?.[1];
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

/** Il verticale e' quello le cui voci X stanno tutte fra i trattati e le altre fra i non coperti. */
function verticaleCompatibile(v: VerticaleAllegato, trattati: string, nonCoperti: string): boolean {
  return v.voci.every((voce) => {
    const l = normalize(voce.label);
    return voce.covered
      ? trattati.includes(l) && !nonCoperti.includes(l)
      : nonCoperti.includes(l) && !trattati.includes(l);
  });
}

test.describe("B11 — vetrina degli ambiti nella homepage dell'azienda", () => {
  test("ogni azienda mostra i due gruppi e ci distribuisce tutte e sole le voci del suo verticale", async ({ page }) => {
    const verticali = readAllegato();
    const slugs = await slugsFromGallery(page);
    expect(slugs.length, "aziende in galleria").toBe(3);

    const abbinati: string[] = [];

    for (const slug of slugs) {
      await page.goto(`/wiki/${slug}`);

      const gTrattati = page.locator('[data-testid="ambiti-trattati"]');
      const gNonCoperti = page.locator('[data-testid="ambiti-non-coperti"]');
      await expect(gTrattati, `gruppo "ambiti trattati" in /wiki/${slug}`).toBeVisible();
      await expect(gNonCoperti, `gruppo "ambiti non coperti" in /wiki/${slug}`).toBeVisible();

      const trattati = normalize(await gTrattati.innerText());
      const nonCoperti = normalize(await gNonCoperti.innerText());
      expect(trattati.length, `il gruppo "ambiti trattati" di ${slug} non deve essere vuoto`).toBeGreaterThan(0);
      expect(nonCoperti.length, `il gruppo "ambiti non coperti" di ${slug} non deve essere vuoto`).toBeGreaterThan(0);

      const compatibili = verticali.filter((v) => verticaleCompatibile(v, trattati, nonCoperti));
      expect(
        compatibili.map((v) => v.name),
        `la vetrina di ${slug} deve corrispondere a esattamente un verticale dell'allegato.\nTRATTATI: ${trattati}\nNON COPERTI: ${nonCoperti}`,
      ).toHaveLength(1);

      const mio = compatibili[0];
      abbinati.push(mio.name);

      // B6 — nessuna voce che appartiene solo agli altri verticali finisce in questa vetrina.
      const mie = new Set(mio.voci.map((v) => normalize(v.label)));
      const altrui = verticali
        .filter((v) => v.name !== mio.name)
        .flatMap((v) => v.voci.map((o) => normalize(o.label)))
        .filter((l) => !mie.has(l));
      for (const l of new Set(altrui)) {
        expect(trattati.includes(l), `voce di un altro verticale fra gli ambiti trattati di ${slug}: "${l}"`).toBe(false);
        expect(nonCoperti.includes(l), `voce di un altro verticale fra gli ambiti non coperti di ${slug}: "${l}"`).toBe(false);
      }
    }

    // B1 lato UI — i 3 verticali dell'allegato sono coperti una volta ciascuno.
    expect([...abbinati].sort()).toEqual(verticali.map((v) => v.name).sort());
  });
});
