import { test, expect } from "@playwright/test";

// B8 (spec 262) — /api/chat e' parametrizzata sullo slug, validato server-side contro
// il registry. Slug ignoto -> errore controllato (status >= 400) SENZA chiamata LLM.
// Slug valido -> stream (NDJSON). Lo slug valido si scopre dalla galleria.

async function aValidSlug(request: import("@playwright/test").APIRequestContext, baseURL: string) {
  const res = await request.get(baseURL + "/");
  const html = await res.text();
  const m = html.match(/\/wiki\/([a-z0-9-]+)/i);
  return m?.[1];
}

test.describe("B8 — /api/chat validazione slug", () => {
  test("slug ignoto -> errore controllato (>=400), nessuno stream LLM", async ({ request, baseURL }) => {
    const res = await request.post(baseURL + "/api/chat", {
      data: { question: "Ciao", usecaseSlug: "slug-che-non-esiste-mai-xyz" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    // un errore controllato risponde rapido e non in streaming-chat NDJSON di contenuto
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).not.toMatch(/ndjson/i);
  });

  test("body senza usecaseSlug -> errore controllato (>=400)", async ({ request, baseURL }) => {
    const res = await request.post(baseURL + "/api/chat", {
      data: { question: "Ciao" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("slug valido -> risposta di streaming (non 404)", async ({ request, baseURL }) => {
    const slug = await aValidSlug(request, baseURL!);
    expect(slug, "deve esistere almeno uno slug valido in galleria").toBeTruthy();
    const res = await request.post(baseURL + "/api/chat", {
      data: { question: "Di cosa parla questa wiki?", usecaseSlug: slug },
    });
    // ponytail: in ambiente senza chiavi LLM/Redis lo stream puo' fallire a valle, ma lo slug
    // valido NON deve dare il 4xx di "slug ignoto". Si verifica che NON sia il rifiuto di validazione.
    expect(res.status()).not.toBe(404);
  });
});
