import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./contrast.ts";
import { CONTRAST_MIN_TEXT, CONTRAST_MIN_UI, color, explorer } from "./tokens.ts";

describe("explorer palette", () => {
  it("keeps map text at 4.5:1 on the sky", () => {
    for (const fg of [explorer.label, explorer.labelBelow, explorer.labelSelected, explorer.cardinal]) {
      expect(contrastRatio(fg, explorer.background)).toBeGreaterThanOrEqual(CONTRAST_MIN_TEXT);
    }
  });

  it("keeps lines, the horizon, stars and the selection ring at 3:1", () => {
    for (const fg of [explorer.line, explorer.lineHover, explorer.lineSelected, explorer.horizon, explorer.star, explorer.selection]) {
      expect(contrastRatio(fg, explorer.background)).toBeGreaterThanOrEqual(CONTRAST_MIN_UI);
    }
  });

  it("does not use the accent for anything on the map", () => {
    const used: unknown[] = Object.values(explorer);
    expect(used.includes(color.accent)).toBe(false);
  });
});

describe("constellation hover look (FR-013)", () => {
  it("is softer than selection: a line width between normal and selected, in a colour of its own", () => {
    expect(explorer.width.lineHover).toBeGreaterThan(explorer.width.line);
    expect(explorer.width.lineHover).toBeLessThan(explorer.width.lineSelected);
    expect(explorer.lineHover).not.toBe(explorer.line);
    expect(explorer.lineHover).not.toBe(explorer.lineSelected);
    expect(contrastRatio(explorer.lineHover, explorer.background)).toBeGreaterThanOrEqual(CONTRAST_MIN_UI);
  });
});

describe("interface font", () => {
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

  it("sets Inter Variable first in the body stack and in every map label font", () => {
    expect(css).toMatch(/--font-body:\s*"Inter Variable", system-ui/);
    for (const font of Object.values(explorer.font)) expect(font).toContain("'Inter Variable'");
  });

  it("self-hosts only the latin subset, with no remote font URL", () => {
    expect(css).toContain("inter-latin-wght-normal.woff2");
    expect(css).not.toMatch(/inter-(cyrillic|greek|vietnamese|latin-ext)/);
    expect(css).not.toMatch(/url\(["']?https?:/);
  });
});
