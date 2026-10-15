import { execFileSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The versions the docs footer prints. `site/package.json` is the product's
// single source — one place, so the docs cannot drift from the release —
// and `package.json` is the docs site's own.
import productPkg from "../../site/package.json" with { type: "json" };
import docsPkg from "./package.json" with { type: "json" };
import { footerVersions } from "./scripts/footer-versions.ts";

function git(...args: string[]): string {
  try {
    return execFileSync("git", ["-C", new URL("../..", import.meta.url).pathname, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const versions = footerVersions({
  repoUrl: "https://github.com/lucasvmigotto/starsky",
  name: "starsky",
  docsVersion: docsPkg.version,
  docsPath: "docs/site",
  git: {
    exactTag: git("describe", "--tags", "--exact-match", "--match", productPkg.version),
    lastTag: productPkg.version,
    sha: git("rev-parse", "HEAD"),
  },
});

export default defineConfig({
  // Served under /starsky/ on the docs host (docs.lucasvmigotto.me/starsky).
  // CI may override per deploy target.
  base: process.env["DOCS_BASE_PATH"] ?? "/starsky/",
  plugins: [react(), tailwindcss()],
  define: {
    __VERSIONS__: JSON.stringify(versions),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
});
