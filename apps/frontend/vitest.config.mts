import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Só Client Component (dialog, form, linha interativa) — Server Component assíncrono não
// roda no Vitest (ver node_modules/next/dist/docs/.../testing/vitest.md), isso é trabalho
// do Playwright (e2e/). include restrito a .tsx pra não colidir com os .test.ts existentes
// em src/lib/*, que usam node:test/node:assert, não os globais do Vitest.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
