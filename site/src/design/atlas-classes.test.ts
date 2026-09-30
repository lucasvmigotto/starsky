/**
 * The `atlas-*` class names must survive the retheme (spec.md DS-003).
 *
 * Vision D7 keeps the names and replaces their values, because renaming them
 * churns the whole stylesheet and every e2e selector for no user-visible gain.
 * This test is what makes that a guarantee rather than an intention: a rename
 * fails here instead of quietly rewriting 88 journeys.
 *
 * It also asserts the *values* moved, so the test cannot pass by doing nothing.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(join(import.meta.dirname, "..", "index.css"), "utf-8");

/**
 * The names the product and its journeys depend on. Grouped by what they draw,
 * so a failure says which part of the UI lost its vocabulary.
 */
const REQUIRED: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    "page frame",
    ["atlas-page", "atlas-header", "atlas-main", "atlas-footer"],
  ],
  [
    "the poster moment",
    ["atlas-moment", "atlas-explorer", "atlas-loaded"],
  ],
  ["panels and states", ["atlas-panel", "atlas-empty", "atlas-alert", "atlas-loading"]],
  ["controls", ["atlas-btn", "atlas-btn-ghost", "atlas-btn-subtle", "atlas-link", "atlas-figure", "atlas-figure-active", "atlas-tooltip"]],
  ["the landing form", ["atlas-form", "atlas-form-wrap", "atlas-form-legend", "atlas-form-field"]],
  [
    "the form's controls",
    [
      "atlas-form-group",
      "atlas-form-grid",
      "atlas-form-row",
      "atlas-form-radio-row",
      "atlas-form-radio",
      "atlas-form-check-row",
      "atlas-form-check",
      "atlas-form-value",
      "atlas-form-range",
      "atlas-form-hint",
      "atlas-form-details",
      "atlas-form-error",
      "atlas-form-submit",
      "atlas-form-alt",
      "atlas-form-linkbtn",
      "atlas-form-explainer",
      "atlas-form-input",
      "atlas-form-label",
    ],
  ],
  ["export", ["atlas-export", "atlas-export-actions", "atlas-export-label", "atlas-export-button", "atlas-export-status"]],
  ["inline code in prose", ["atlas-code"]],
];

describe("atlas-* class vocabulary (DS-003)", () => {
  for (const [group, names] of REQUIRED) {
    for (const name of names) {
      it(`${group}: .${name} is still defined`, () => {
        expect(CSS).toContain(`.${name}`);
      });
    }
  }

  it("no class selector uses a raw colour literal (DS-007)", () => {
    // Guard the whole stylesheet in one assertion: any `#hex` or `rgb(` after a
    // selector means a value escaped the token layer.
    const escapes = CSS.match(
      /^\s*\.[a-z-]+[^{]*\{[^}]*(#[0-9a-fA-F]{3,6}|rgba?\()/gm,
    );
    expect(escapes).toBeNull();
  });

  it("declares color-scheme: dark once, on :root (DS-002)", () => {
    expect(CSS).toMatch(/:root\s*\{[^}]*color-scheme:\s*dark/);
  });

  it("replaced the old palette rather than keeping it (DS-001)", () => {
    // The old ink/cream/rose were the poster's colours too, so they must be
    // gone from the interface. They remain normative in render-spec.json — this
    // asserts only that the stylesheet stopped using them. Assembled from parts
    // so the literal-colour rule does not read a test fixture as a value.
    for (const old of ["0b0f19", "f5efe0", "b98a8a"]) {
      expect(CSS).not.toContain(`#${old}`);
    }
  });

  it("honours prefers-reduced-motion for the reveal and every transition", () => {
    const block = CSS.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block?.[1]).toContain("animation: none");
    expect(block?.[1]).toContain("transition: none");
  });

  it("gives every focus ring the focus token", () => {
    const rings = CSS.match(/outline: [^;]+;/g) ?? [];
    expect(rings.length).toBeGreaterThan(0);
    for (const ring of rings) {
      expect(ring).toContain("var(--color-focus)");
    }
  });

  it("never removes a focus outline", () => {
    expect(CSS).not.toMatch(/outline:\s*(none|0)/);
  });

  /**
   * AI-default trait #5: "a tracked-out ALL-CAPS eyebrow label above every
   * heading". The stylesheet had exactly that on `.atlas-export-label` while the
   * vision listed it as avoided — the retheme checked contrast and never looked
   * at the typography. These assertions make the vision's rule executable.
   */
  it("uses no tracked-out uppercase eyebrow (AI-default #5)", () => {
    // Comments explain these rules and quote the old declarations, so strip
    // them before scanning — otherwise the explanation fails its own assertion.
    const css = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/text-transform:\s*uppercase/);
    // The 0.08em/0.1em tracking that pairs with a caps eyebrow.
    expect(css).not.toMatch(/letter-spacing:\s*0\.0[5-9]em/);
  });

  it("keeps the export row quiet, so the poster stays the loudest thing", () => {
    // Vision principle 2. The export buttons were cream fills — the brightest
    // thing on the page after the poster, which the ui.md wireframe contradicts.
    const block = CSS.replace(/\/\*[\s\S]*?\*\//g, "").match(
      /\.atlas-export-button \{([\s\S]*?)\n\}/,
    );
    expect(block).not.toBeNull();
    expect(block?.[1]).toContain("background: transparent");
    expect(block?.[1]).not.toMatch(/background:\s*var\(--color-text\)/);
  });

  it("gives every button at least the 44px target height (DS-A11Y-003)", () => {
    for (const name of ["atlas-btn", "atlas-btn-ghost", "atlas-export-button"]) {
      const block = CSS.match(new RegExp(`\\.${name} \\{([\\s\\S]*?)\\n\\}`));
      expect(block?.[1], `${name} has no min-height`).toContain("min-height: 44px");
    }
  });
});