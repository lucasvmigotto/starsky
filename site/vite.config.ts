import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The version the footer prints. `site/package.json` is the single source —
// one place for a static-only site, so the number in the footer cannot drift
// from the package (000-design-system T021).
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
});
