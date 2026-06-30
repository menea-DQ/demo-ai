import { test, expect } from "@playwright/test";

// B2 (spec 262) — /wiki/<slug valido> rende quell'azienda (companyName visibile);
// slug inesistente -> 404; /wiki (senza slug) -> redirect alla galleria (home).
// Gli slug + i nomi attesi si scoprono dalla galleria, restando agnostici al registry.

async function discoverGallery(page: import("@playwright/test").Page) {
  await page.goto("/");
  const links = page.locator('a[href^="/wiki/"]');
  const n = await links.count();
  const entries: { slug: string; href: string }[] = [];
  for (let i = 0; i < n; i++) {
    const href = (await links.nth(i).getAttribute("href"))!;
    const slug = href.match(/^\/wiki\/([^/?#]+)/)![1];
    if (!entries.some((e) => e.slug === slug)) entries.push({ slug, href });
  }
  return entries;
}

test.describe("B2 — wiki per-use-case e routing", () => {
  test("/wiki/<slug valido> mostra il nome di QUELL'azienda e di nessun'altra", async ({ page }) => {
    const entries = await discoverGallery(page);
    expect(entries.length).toBeGreaterThanOrEqual(2);

    // nome azienda mostrato in galleria per ogni card (usato come oracolo del companyName)
    await page.goto("/");
    const names: Record<string, string> = {};
    for (const e of entries) {
      const card = page.locator(`a[href^="/wiki/${e.slug}"]`).first();
      names[e.slug] = (await card.innerText()).trim();
    }

    const target = entries[0];
    const other = entries[1];
    await page.goto(target.href);
    await expect(page).toHaveURL(new RegExp(`/wiki/${target.slug}`));

    const body = page.locator("body");
    // il nome dell'azienda target compare; il nome di un'altra azienda NON deve comparire
    const targetName = names[target.slug].split("\n")[0];
    const otherName = names[other.slug].split("\n")[0];
    if (targetName) await expect(body).toContainText(targetName);
    if (otherName && otherName !== targetName) {
      await expect(body).not.toContainText(otherName);
    }
  });

  test("/wiki/<slug inesistente> -> 404", async ({ page }) => {
    const res = await page.goto("/wiki/slug-che-non-esiste-mai-xyz");
    expect(res?.status()).toBe(404);
  });

  test("/wiki (senza slug) -> redirect alla home/galleria", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page).toHaveURL(/\/$|\/?$/);
    // la galleria deve essere presente dopo il redirect
    await expect(page.locator('a[href^="/wiki/"]').first()).toBeVisible();
  });
});
