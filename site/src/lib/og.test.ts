import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

/**
 * Social preview contract: crawlers read static index.html (no JS), so the
 * OG/Twitter tags must exist in source with the build-time base-URL
 * placeholder (`%VITE_FULL_APP_URL%`, substituted by Vite from
 * `vars.STARSKY_STATIC_SITE_URL`). The R2 workflow additionally greps the
 * built dist for absolute https:// URLs.
 */
const INDEX_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "index.html"),
  "utf-8",
);

function hasTag(attr: string, name: string): boolean {
  return INDEX_HTML.includes(`${attr}="${name}"`);
}

describe("social preview tags", () => {
  it("declares OG article metadata with placeholder base URL", () => {
    for (const property of [
      "og:type",
      "og:site_name",
      "og:title",
      "og:description",
      "og:url",
      "og:image",
    ]) {
      expect(hasTag("property", property)).toBe(true);
    }
    expect(INDEX_HTML).toContain("%VITE_FULL_APP_URL%/og-banner.png");
  });

  it("declares a large-image Twitter card", () => {
    for (const name of [
      "twitter:card",
      "twitter:title",
      "twitter:description",
      "twitter:image",
    ]) {
      expect(hasTag("name", name)).toBe(true);
    }
    expect(INDEX_HTML).toContain('content="summary_large_image"');
  });

  it("pins the banner dimensions for layout stability", () => {
    expect(INDEX_HTML).toContain('property="og:image:width"');
    expect(INDEX_HTML).toContain('content="1200"');
    expect(INDEX_HTML).toContain('property="og:image:height"');
    expect(INDEX_HTML).toContain('content="630"');
  });

  it("links a favicon that exists in public/", () => {
    expect(INDEX_HTML).toContain('rel="icon"');
    expect(INDEX_HTML).toContain('href="./favicon.svg"');
    const here = dirname(fileURLToPath(import.meta.url));
    expect(existsSync(join(here, "..", "..", "public", "favicon.svg"))).toBe(
      true,
    );
  });
});
