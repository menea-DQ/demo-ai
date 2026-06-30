import { defineConfig } from "@playwright/test";

// ponytail: e2e richiede Redis attivo + env dell'app (SESSION_SECRET, ecc.) per passare davvero;
// il webServer avvia `pnpm dev` (che runna predev: wiki-graph). I test e2e li scrive il test-author dalla spec.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
