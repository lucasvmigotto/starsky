import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

/** The declarations of the first rule whose selector list contains `selector`. */
function rule(selector: string, from = 0): string {
  const re = new RegExp(`(^|\\n)([^{}\\n]*${selector.replace(/[[\].*+?^${}()|\\"]/g, "\\$&")}[^{}]*)\\{([^}]*)\\}`, "g");
  re.lastIndex = from;
  const m = re.exec(css);
  if (!m) throw new Error(`no rule for ${selector}`);
  return m[3];
}

describe("the side panel slides", () => {
  it("moves by transform, with the panel motion token, when closed", () => {
    const closed = rule('.explorer-inspector[data-open="false"]');
    expect(closed).toContain("translateX(100%)");
    expect(closed).toContain("visibility: hidden");
    expect(css).toMatch(/\.explorer-inspector[^{]*\{[^}]*transition:[^}]*transform var\(--motion-duration-panel\) var\(--motion-ease\)/);
  });

  it("carries the tab with it", () => {
    const open = rule('.explorer-tab[aria-expanded="true"]');
    expect(open).toContain("translate(calc(-1 * var(--explorer-panel-w))");
    expect(css).toMatch(/\.explorer-tab[^{]*\{[^}]*transition:[^}]*transform var\(--motion-duration-panel\)/);
  });

  it("has no motion under prefers-reduced-motion", () => {
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .explorer-toolbar"));
    expect(reduced).toContain(".explorer-inspector");
    expect(reduced).toContain(".explorer-tab");
    expect(reduced).toMatch(/transition:\s*none/);
  });
});

describe("the panel tab and the resting borders", () => {
  it("wears the toolbar container's surface, border and radius", () => {
    const face = rule(".explorer-tab-face");
    expect(face).toContain("background: color-mix(in srgb, var(--color-surface) 90%, transparent)");
    expect(face).toContain("border: 1px solid var(--color-border-soft)");
    expect(face).toContain("var(--radius-panel)");
    expect(face).not.toContain("--color-accent");
    expect(face).not.toContain("--color-focus");
  });

  it("never rests an Explorer control on the accent or focus colour", () => {
    for (const selector of [
      '.atlas-btn-icon[aria-pressed="true"]',
      '.explorer-list-item[aria-current="true"]',
    ]) {
      expect(rule(selector)).not.toMatch(/border[^;]*--color-(accent|focus)/);
    }
  });
});
