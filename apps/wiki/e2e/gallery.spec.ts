import { test, expect } from "@playwright/test";

// B1 (spec 262) — la landing e' una galleria che elenca TUTTE le aziende del registry,
// ognuna con un link navigabile a /wiki/<slug>. Agnostico al numero di aziende:
// si scoprono gli slug dai link presenti in pagina (>=3 per spec).

test.describe("B1 — landing come galleria", () => {
  test("la home elenca >=3 aziende, ognuna con link a /wiki/<slug>", async ({ page }) => {
    await page.goto("/");

    const wikiLinks = page.locator('a[href^="/wiki/"]');
    const count = await wikiLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const slugs = new Set<string>();
    for (let i = 0; i < count; i++) {
      const href = await wikiLinks.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      const m = href!.match(/^\/wiki\/([^/?#]+)/);
      expect(m, `href '${href}' deve essere /wiki/<slug>`).not.toBeNull();
      slugs.add(m![1]);
    }
    // almeno 3 slug distinti raggiungibili dalla galleria
    expect(slugs.size).toBeGreaterThanOrEqual(3);
  });

  test("cliccando una card si naviga a /wiki/<slug>", async ({ page }) => {
    await page.goto("/");
    const firstLink = page.locator('a[href^="/wiki/"]').first();
    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
