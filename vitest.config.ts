import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@galaxy/schemas": path.resolve(__dirname, "./packages/galaxy-src/schemas/index.ts"),
    },
  },
});
