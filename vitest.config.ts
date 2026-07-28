import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // tsconfig zet jsx op "preserve" (voor Next). Vite 8 transformeert met oxc en
  // zou JSX dan onvertaald laten, waardoor specs die een .tsx importeren
  // stuklopen op "invalid JS syntax" tijdens import-analyse. Forceer hier de
  // automatische JSX-runtime zodat de testtransform los van de Next-tsconfig
  // werkt.
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    },
  },
});
