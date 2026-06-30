import { defineConfig } from "@playwright/test";

// ponytail: e2e richiede Redis attivo + env dell'app per passare davvero; il webServer avvia
// `pnpm dev` sulla porta 3002 (che runna predev: seed-db). I test e2e li scrive il test-author dalla spec.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3002" },
  webServer: {
    command: "PORT=3002 pnpm dev",
    url: "http://localhost:3002",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
