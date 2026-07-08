import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    include: ["**/*.integration.test.ts"],
    exclude: ["e2e/**"],
    setupFiles: ["./src/test/setup.ts", "./src/test/msw/setupIntegration.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@galaxy/schemas": path.resolve(__dirname, "./packages/galaxy-src/schemas/index.ts"),
    },
  },
});
