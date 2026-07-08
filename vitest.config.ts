import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // fileURLToPath (not .pathname) so a repo path containing spaces or other
      // URL-escaped characters decodes correctly — otherwise "@/…" imports fail
      // to resolve. The DOM tests are the first to import app code via this alias.
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  }
});
