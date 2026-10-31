/**
 * 014-explorer-polish T001: the two radii by role, and the artifact exception.
 * Reads the stylesheet and the vision so a drift in either fails here.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(join(import.meta.dirname, "..", "index.css"), "utf-8");
const VISION = readFileSync(join(import.meta.dirname, "..", "..", "..", "docs", "product", "ux-vision.md"), "utf-8");

const px = (n: number): string => `${String(n)}px`;

function token(name: string): string | undefined {
  return new RegExp(`${name}:\\s*([^;]+);`).exec(CSS)?.[1]?.trim();
}

function rule(selector: string): string {
  const start = CSS.indexOf(`${selector} {`);
  if (start < 0) return "";
  return CSS.slice(start, CSS.indexOf("}", start));
}

describe("corner radii", () => {
  it("rounds controls to 8px and panels to 12px", () => {
    expect(token("--radius-control")).toBe(px(8));
    expect(token("--radius-panel")).toBe(px(12));
  });

  it("keeps a separate token for surfaces that show the poster, square by default", () => {
    expect(token("--radius-artifact")).toBe(px(0));
    expect(rule(".atlas-studio-canvas")).toContain("border-radius: var(--radius-artifact)");
  });

  it("never uses a pill radius", () => {
    expect(CSS).not.toMatch(/border-radius:\s*(9999px|999px|100vmax)/);
  });

  it("states the new radii and reasoning in the vision", () => {
    const section = VISION.slice(VISION.indexOf("### Spacing, radius, elevation"), VISION.indexOf("### Motion"));
    expect(section).toContain("`8px`");
    expect(section).toContain("`12px`");
    expect(section).toContain("`radius.artifact`");
    expect(section).not.toContain("Radius `2px`");
  });
});
