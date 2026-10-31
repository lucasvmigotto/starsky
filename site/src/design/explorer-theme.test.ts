import { describe, expect, it } from "bun:test";
import { contrastRatio } from "./contrast.ts";
import { CONTRAST_MIN_TEXT, CONTRAST_MIN_UI, color, explorer } from "./tokens.ts";

describe("explorer palette", () => {
  it("keeps map text at 4.5:1 on the sky", () => {
    for (const fg of [explorer.label, explorer.labelBelow, explorer.labelSelected, explorer.cardinal]) {
      expect(contrastRatio(fg, explorer.background)).toBeGreaterThanOrEqual(CONTRAST_MIN_TEXT);
    }
  });

  it("keeps lines, the horizon, stars and the selection ring at 3:1", () => {
    for (const fg of [explorer.line, explorer.lineSelected, explorer.horizon, explorer.star, explorer.selection]) {
      expect(contrastRatio(fg, explorer.background)).toBeGreaterThanOrEqual(CONTRAST_MIN_UI);
    }
  });

  it("does not use the accent for anything on the map", () => {
    const used: unknown[] = Object.values(explorer);
    expect(used.includes(color.accent)).toBe(false);
  });
});
