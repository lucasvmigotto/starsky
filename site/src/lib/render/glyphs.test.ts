/**
 * `glyphs.ts` — deciding what the poster face can draw.
 *
 * The whole point of reading the font's `cmap` rather than asking a browser is
 * that **this file can prove the answer**. Two browser probes shipped before it
 * and both were wrong in opposite directions, silently, with 253 green unit
 * tests throughout — because a test that injects its own probe is testing the
 * branch, never the question. These tests use the real font.
 *
 * The regression that matters most is named in `glyph-coverage.test.ts`: the
 * bundled face covers Latin-1 accents and punctuation, and has no emoji or CJK.
 */
import { describe, expect, it } from "bun:test";
import {
  fontCanDraw,
  stripUnsupported,
  uniqueCharacters,
  unsupportedInPosterFont,
} from "./glyphs.ts";
import { POSTER_FONT_RANGES } from "./glyph-coverage.generated.ts";

describe("the generated coverage table", () => {
  it("is a plausible set of ranges for a Latin text face", () => {
    // The exact count moves when the font does; the bound asserts the generator
    // found a table, not which font it found.
    expect(POSTER_FONT_RANGES.length).toBeGreaterThan(10);
    expect(POSTER_FONT_RANGES.length).toBeLessThan(2000);
    // Ranges are sorted and non-overlapping, or the binary search lies.
    for (let i = 1; i < POSTER_FONT_RANGES.length; i += 1) {
      const previous = POSTER_FONT_RANGES[i - 1] ?? [0, -1];
      const current = POSTER_FONT_RANGES[i] ?? [0, -1];
      expect(current[0]).toBeGreaterThan(previous[1]);
    }
  });

  it("agrees with the face it was generated from", async () => {
    // `glyph-coverage.test.ts` asserts this against the font itself; this is
    // the cheap half, so a stale table fails here too.
    const { execFileSync } = await import("node:child_process");
    expect(() =>
      execFileSync("python3", ["scripts/generate_glyph_coverage.py", "--check"], {
        cwd: new URL("../../..", import.meta.url).pathname,
      }),
    ).not.toThrow();
  });

  it("covers ASCII and the caption's punctuation", () => {
    // Membership against a string constant, not a spread over one: every entry
    // is BMP so iteration would agree, but the linter is right that spreading
    // splits astral characters, and this is a test *about* characters.
    const sample =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" +
      "°—·’";
    for (const character of sample) {
      expect(fontCanDraw(character), `${character} must be drawable`).toBe(true);
    }
  });
});

describe("uniqueCharacters", () => {
  it("keeps first-appearance order and drops repeats", () => {
    expect(uniqueCharacters("abcabc")).toEqual(["a", "b", "c"]);
  });

  it("splits an astral character into one entry, not two surrogates", () => {
    // `[...text]` iterates code points, so 🌌 is one character. A `split("")`
    // or a naive index loop would yield lone surrogates and probe garbage.
    expect(uniqueCharacters("a🌌b")).toEqual(["a", "🌌", "b"]);
  });
});

describe("unsupportedInPosterFont", () => {
  it("accepts plain ASCII", () => {
    expect(unsupportedInPosterFont("E2E Night")).toEqual([]);
    expect(unsupportedInPosterFont("Times Square")).toEqual([]);
  });

  it("accepts every accent and punctuation mark the caption emits", () => {
    const caption = "23.5500°S, 46.6300°W — São Paulo, Brasil · Jan 15, 2026";
    expect(unsupportedInPosterFont(caption)).toEqual([]);
  });

  it("treats whitespace and control characters as drawable", () => {
    // No `cmap` lists a space — the renderer positions it, the face does not
    // draw it. Reporting it missing would strip the spaces out of every title.
    expect(unsupportedInPosterFont("Noite Austral")).toEqual([]);
    expect(unsupportedInPosterFont("a b\tc")).toEqual([]);
  });

  it("rejects emoji and CJK, naming each one", () => {
    expect(unsupportedInPosterFont("E2E 🌌 Night")).toEqual(["🌌"]);
    expect(unsupportedInPosterFont("東京の夜")).toEqual(["東", "京", "の", "夜"]);
  });

  it("reports each offending character once, however often it appears", () => {
    expect(unsupportedInPosterFont("🌌🌌 night 🌌")).toEqual(["🌌"]);
  });

  it("accepts an empty or absent title", () => {
    expect(unsupportedInPosterFont("")).toEqual([]);
  });

  /**
   * The regression that reached `dev` twice. A browser probe measuring a
   * fallback reported the *narrowest* glyphs as missing — `h`, `S`, `u` of
   * "E2E Night" / "Times Square" — and the feature stripped them out of every
   * title on the page. Reading the `cmap` cannot drift per environment, so this
   * is the assertion that would have caught it before CI did.
   */
  it("does not mistake narrow ASCII letters for missing glyphs", () => {
    expect(unsupportedInPosterFont("E2E Night")).toEqual([]);
    expect(unsupportedInPosterFont("Times Square")).toEqual([]);
    expect(unsupportedInPosterFont("Almost nothing")).toEqual([]);
    // The narrowest glyphs in the face, which is what a notdef comparison
    // misread as missing.
    for (const letter of ["h", "S", "u", "i", "t", "r", "s", "l", "f", "I"]) {
      expect(unsupportedInPosterFont(letter), `${letter} must be drawable`).toEqual([]);
    }
  });
});

describe("stripUnsupported", () => {
  it("returns null when there is nothing to strip, so the caller can tell", () => {
    // `null` (unchanged) and `""` (emptied) are different answers: the first
    // means render as-is, the second means fall back to an untitled poster.
    expect(stripUnsupported("Céu Austral")).toBeNull();
    expect(stripUnsupported("")).toBeNull();
  });

  it("drops the undrawable characters and keeps the rest", () => {
    expect(stripUnsupported("Noite 🌌 Austral")).toBe("Noite Austral");
  });

  it("keeps accents untouched", () => {
    expect(stripUnsupported("Céu Austral 🌙")).toBe("Céu Austral");
  });

  it("reports an emptied title as an empty string, not null", () => {
    // A title of only emoji becomes untitled rather than a blank line on the
    // poster, and the caller can still warn because the return is not null.
    expect(stripUnsupported("🌌")).toBe("");
  });

  it("closes the gap a removed character leaves behind", () => {
    // "Noite 🌌 Austral" → "Noite  Austral" if the gap is not collapsed, which
    // on the poster reads as a typo in the sender's typing rather than as our
    // adjustment.
    expect(stripUnsupported("Noite 🌌 Austral")).not.toContain("  ");
    expect(stripUnsupported("🌌 Noite")).toBe("Noite");
    expect(stripUnsupported("Noite 🌌")).toBe("Noite");
    // Whitespace the sender did write is left alone.
    expect(stripUnsupported("Noite  Austral")).toBeNull();
  });
});

