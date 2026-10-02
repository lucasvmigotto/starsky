/**
 * `glyphs.ts` — deciding what the poster face can draw.
 *
 * The probe is injected throughout. That is not only for testability:
 * `document.fonts` does not exist under bun, and a unit test that had to
 * fabricate a DOM to exercise five lines of logic would test the fabrication.
 *
 * The cases that matter most are the two ways this can go wrong in production:
 * rejecting a title the face *can* draw (a false positive locks a visitor out),
 * and accepting one it cannot (the notdef box this exists to prevent).
 */
import { describe, expect, it } from "bun:test";
import {
  stripUnsupported,
  uniqueCharacters,
  unsupportedInPosterFont,
} from "./glyphs.ts";

/**
 * The face as it actually is, measured 2026-10-02 (see glyph-coverage.test.ts).
 *
 * A string constant tested with `includes`, rather than a `Set` built by
 * spreading or splitting one. Every character here is BMP, so iterating by code
 * point or by UTF-16 unit would agree — but the lint rule objects to both, and
 * its suggested `Intl.Segmenter` is the wrong tool for a fixture whose job is
 * "is this one character drawable". Membership needs no iteration at all.
 */
const LATIN1_AND_PUNCTUATION =
  "abcdefghijklmnopqrstuvwxyz" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "0123456789" +
  " .,:;!?'\"()[]-_/\\" +
  "–—°·→" +
  "áàâãäåéèêëíìîïóòôõöúùûüñçøß" +
  "ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇØÆæŒœŁł";

/** Stand-in for the browser: drawable iff the real face has the glyph. */
function faceProbe(character: string): boolean {
  return LATIN1_AND_PUNCTUATION.includes(character);
}

/** A probe for a face that has loaded nothing — the trap `fontsReady` avoids. */
const NOT_LOADED = (): boolean => false;

/**
 * The probe interface is injected everywhere, which is what let the first
 * implementation — `document.fonts.check` — ship with 13 green unit tests and
 * still be wrong in every browser. These prove the *branching*; the
 * discrimination is proved in `site/e2e/undrawable-title.spec.ts`, against the
 * real font, because only a real browser can say whether the algorithm tells an
 * emoji from an accent.
 */
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
    expect(unsupportedInPosterFont("Noite Austral", faceProbe)).toEqual([]);
  });

  it("accepts every accent and punctuation mark the caption emits", () => {
    const caption = "23.5500°S, 46.6300°W — São Paulo, Brasil · Jan 15, 2026";
    expect(unsupportedInPosterFont(caption, faceProbe)).toEqual([]);
  });

  it("rejects emoji and CJK, naming each one", () => {
    expect(unsupportedInPosterFont("Noite 🌌", faceProbe)).toEqual(["🌌"]);
    expect(unsupportedInPosterFont("東京の夜", faceProbe)).toEqual([
      "東",
      "京",
      "の",
      "夜",
    ]);
  });

  it("reports each offending character once, however often it appears", () => {
    expect(unsupportedInPosterFont("🌌🌌 night 🌌", faceProbe)).toEqual(["🌌"]);
  });

  it("accepts an empty or absent title", () => {
    expect(unsupportedInPosterFont("", faceProbe)).toEqual([]);
  });

  it("mass-rejects when the face has not loaded, which is why fontsReady exists", () => {
    // The trap this guards. A face still loading reports *every* character as
    // unsupported, so probing too early refuses every title in the product —
    // including plain "Noite Austral". The assertion is deliberately the ugly
    // one: it is meant to look wrong, because it is what the bug looks like.
    const title = "Noite Austral";
    const flagged = unsupportedInPosterFont(title, NOT_LOADED);
    expect(flagged).toEqual(uniqueCharacters(title));
    expect(flagged).toHaveLength(12); // "a" appears twice.
    // With the real face the same title is fine: the difference is the font
    // being loaded, not the input.
    expect(unsupportedInPosterFont(title, faceProbe)).toEqual([]);
  });
});

describe("stripUnsupported", () => {
  it("returns null when there is nothing to strip, so the caller can tell", () => {
    // `null` (unchanged) and `""` (emptied) are different answers: the first
    // means render as-is, the second means fall back to an untitled poster.
    expect(stripUnsupported("Céu Austral", faceProbe)).toBeNull();
    expect(stripUnsupported("", faceProbe)).toBeNull();
  });

  it("drops the undrawable characters and keeps the rest", () => {
    expect(stripUnsupported("Noite 🌌 Austral", faceProbe)).toBe("Noite Austral");
  });

  it("keeps accents untouched", () => {
    expect(stripUnsupported("Céu Austral 🌙", faceProbe)).toBe("Céu Austral");
  });

  it("reports an emptied title as an empty string, not null", () => {
    // A title of only emoji becomes untitled rather than a blank line on the
    // poster, and the caller can still warn because the return is not null.
    expect(stripUnsupported("🌌", faceProbe)).toBe("");
  });

  it("closes the gap a removed character leaves behind", () => {
    // "Noite 🌌 Austral" → "Noite  Austral" if the gap is not collapsed, which
    // on the poster reads as a typo in the sender's typing rather than as our
    // adjustment. Whitespace they did write survives as a single space.
    expect(stripUnsupported("Noite 🌌 Austral", faceProbe)).not.toContain("  ");
    expect(stripUnsupported("🌌 Noite", faceProbe)).toBe("Noite");
    expect(stripUnsupported("Noite 🌌", faceProbe)).toBe("Noite");
    expect(stripUnsupported("Noite  Austral", faceProbe)).toBeNull();
  });
});
