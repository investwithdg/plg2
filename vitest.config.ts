import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // supabase/functions/**/*.test.ts are Deno edge-function tests (use the
    // `Deno` global, run via `deno test` in CI) — not runnable under vitest's
    // Node/jsdom environment.
    exclude: ["**/node_modules/**", "supabase/functions/**"],
  },
});
