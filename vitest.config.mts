import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", env: { PGLITE_MEMORY: "1", AUTH_SECRET: "test-secret" } },
});
