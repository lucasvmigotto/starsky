/**
 * The contrast table, enforced (spec.md DS-001, DS-A11Y-001).
 *
 * The vision *documents* these ratios; this test *keeps* them true. It
 * recomputes every pair from `tokens.ts`, so a hex edited to something
 * prettier fails here rather than shipping unreadable text.
 *
 * `border.soft` is the one deliberate exemption — see its assertion below.
 */
import { describe, expect, it } from "bun:test";
import { color, CONTRAST_MIN_TEXT, CONTRAST_MIN_UI } from "./tokens.ts";
import { contrastRatio, parseHex, round2 } from "./contrast.ts";

/** [foreground, background, minimum, why] — the spec's table, verbatim. */
const TEXT_PAIRS: ReadonlyArray<
  readonly [keyof typeof color, keyof typeof color, number, string]
> = [
  ["text", "bg", CONTRAST_MIN_TEXT, "body text on the page"],
  ["text", "surface", CONTRAST_MIN_TEXT, "body text on a panel"],
  ["text", "raised", CONTRAST_MIN_TEXT, "body text on a hover row"],
  ["textMuted", "bg", CONTRAST_MIN_TEXT, "secondary text"],
  ["textMuted", "surface", CONTRAST_MIN_TEXT, "secondary text on a panel"],
  ["textFaint", "bg", CONTRAST_MIN_TEXT, "hints and metadata"],
  ["accent", "bg", CONTRAST_MIN_TEXT, "a link on the page"],
  ["accent", "surface", CONTRAST_MIN_TEXT, "a link on a panel"],
  ["accentInk", "accent", CONTRAST_MIN_TEXT, "text on an accent fill"],
  ["focus", "bg", CONTRAST_MIN_UI, "focus ring against the page"],
  ["focus", "surface", CONTRAST_MIN_UI, "focus ring against a panel"],
  ["border", "bg", CONTRAST_MIN_UI, "control boundary on the page"],
  ["border", "surface", CONTRAST_MIN_UI, "control boundary on a panel"],
];

describe("contrast", () => {
  it("parses 3- and 6-digit hex, and rejects anything else", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("070b14")).toEqual([7, 11, 20]);
    expect(() => parseHex("#gggggg")).toThrow(/Not a hex/);
    expect(() => parseHex("#12345")).toThrow(/Not a hex/);
  });

  it("anchors the formula at the known extremes", () => {
    // If these drift, every other number here is untrustworthy.
    expect(round2(contrastRatio("#000000", "#ffffff"))).toBe(21);
    expect(round2(contrastRatio("#ffffff", "#ffffff"))).toBe(1);
  });

  for (const [fg, bg, min, why] of TEXT_PAIRS) {
    it(`${fg} on ${bg} ≥ ${String(min)}:1 — ${why}`, () => {
      const ratio = contrastRatio(color[fg], color[bg]);
      expect(round2(ratio)).toBeGreaterThanOrEqual(min);
    });
  }

  it("reports the exact ratios the vision documents", () => {
    // Guards against a token edit that stays above the floor but silently
    // invalidates the published table.
    expect(round2(contrastRatio(color.text, color.bg))).toBe(16.85);
    expect(round2(contrastRatio(color.accent, color.bg))).toBe(10.46);
    expect(round2(contrastRatio(color.border, color.bg))).toBe(3.35);
    expect(round2(contrastRatio(color.focus, color.bg))).toBe(14.14);
  });

  it("keeps border.soft exempt: decorative only, never a control boundary", () => {
    // The exemption is a *decision* (spec.md), so assert both halves: it is
    // genuinely too low for a control, and it stays too low so nobody later
    // mistakes it for one.
    expect(contrastRatio(color.borderSoft, color.bg)).toBeLessThan(
      CONTRAST_MIN_UI,
    );
    expect(color.border).not.toBe(color.borderSoft);
  });

  it("keeps the accent distinct from the poster's rose (vision D19)", () => {
    // The poster's constellation line is #b98a8a from render-spec.json. The UI
    // accent must not silently drift into it, or the boundary between chrome
    // and the artifact disappears.
    const POSTER_LINE = "#b98a8a";
    expect(color.accent).not.toBe(POSTER_LINE);
    expect(round2(contrastRatio(color.accent, POSTER_LINE))).toBeGreaterThan(0.5);
  });
});