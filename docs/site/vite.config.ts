import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The version the docs footer prints. `site/package.json` is the product's
// single source — one place, so the docs cannot drift from the release.
import productPkg from "../../site/package.json" with { type: "json" };

export default defineConfig({
  // Served under /starsky/ on the docs host (docs.lucasvmigotto.me/starsky).
  // CI may override per deploy target.
  base: process.env["DOCS_BASE_PATH"] ?? "/starsky/",
  plugins: [react(), tailwindcss()],
  define: {
    __DOCS_VERSION__: JSON.stringify(productPkg.version),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
});
