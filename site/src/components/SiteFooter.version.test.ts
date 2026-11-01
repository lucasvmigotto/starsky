/**
 * The footer's version must be the package's, not a number someone typed
 * (000-design-system T021/T024, vision D18).
 *
 * `site/package.json` is the single source for a static-only site; the package
 * was renamed `starsky-site` → `starsky` so the name printed in the footer and
 * the package name are the same string.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PKG = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "..", "package.json"), "utf-8"),
) as { name: string; version: string };

const SITE_ROOT = join(import.meta.dirname, "..", "..");

describe("site version", () => {
  it("is named `starsky`, matching the product (D18)", () => {
    expect(PKG.name).toBe("starsky");
  });

  it("declares a version", () => {
    expect(PKG.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("is injected by vite from the package, not hardcoded", () => {
    const config = readFileSync(join(SITE_ROOT, "vite.config.ts"), "utf-8");
    expect(config).toContain("__APP_VERSION__");
    // The define must read the package, so the two cannot drift.
    expect(config).toMatch(/__APP_VERSION__:\s*JSON\.stringify\(pkg\.version\)/);
    expect(config).toContain('from "./package.json"');
  });

  it("is declared for the type checker", () => {
    const types = readFileSync(join(SITE_ROOT, "src", "vite-env.d.ts"), "utf-8");
    expect(types).toContain("declare const __APP_VERSION__: string");
  });

  it("is rendered from the constant in the footer, not a literal", () => {
    const footer = readFileSync(
      join(SITE_ROOT, "src", "components", "SiteFooter.tsx"),
      "utf-8",
    );
    expect(footer).toContain("__APP_VERSION__");
    // A hardcoded version in the footer would drift silently on the next bump.
    expect(footer).not.toMatch(/v\{?\d+\.\d+\.\d+\}?/);
  });

  it("links the repository root, not a tag path (D11)", () => {
    const footer = readFileSync(
      join(SITE_ROOT, "src", "components", "SiteFooter.tsx"),
      "utf-8",
    );
    expect(footer).toContain("https://github.com/lucasvmigotto/starsky");
    // `tree/<version>` 404s until a tag exists for that version.
    expect(footer).not.toContain("/tree/");
  });
});