import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the "@/..." alias (tsconfig paths: "@/*" -> app root) for Vitest.
// Only the unit tests under tests/unit run here; e2e lives under ./e2e (Playwright).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
