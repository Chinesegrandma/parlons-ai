import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
    env: { MOCK_AI: "true" },
  },
  esbuild: { jsx: "automatic" },
});
