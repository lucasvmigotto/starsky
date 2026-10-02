/**
 * Glyph coverage of the bundled poster face (007 T040, charter C1).
 *
 * Charter C1 asks for "a title with accents and emoji". Measured 2026-10-02
 * against `assets/fonts/CormorantGaramond.ttf` as registered with
 * `@napi-rs/canvas`, by comparing each character's advance with the font's
 * notdef advance (U+FFFF, near-certainly absent):
 *
 *   present  N e é ü ø ã ñ ç — · →        (Latin-1 accents, punctuation)
 *   ABSENT   🌌 (U+1F30C) ✨ (U+2728) 東 (U+6771)  → advance == notdef
 *
 * So accents are fine and **emoji and CJK render as tofu**. Nothing about that
 * is a crash — which is the problem. The poster draws through the stack
 * `"Cormorant Garamond", serif`, so a missing glyph falls through to a generic
 * family that has no emoji either, and the render succeeds silently.
 *
 * The three outputs then disagree about the same title, which is what makes
 * this worth pinning rather than leaving to a manual look:
 *
 *   - **PNG** is rasterised at export time, so the notdef box is baked in
 *     permanently and is identical on every machine.
 *   - **SVG** carries the character faithfully (verified: `Noite 🌌` survives
 *     as U+1F30C in the `<text>` node), so what a reader sees depends on which
 *     fonts *their* viewer has — an emoji on a desktop, tofu elsewhere.
 *   - **PDF** embeds a subset of the poster face carrying "exactly the glyphs
 *     the poster can draw" (`export.ts`), and an absent glyph has no outline to
 *     subset.
 *
 * This test pins the *supported* set so a future font change cannot quietly
 * regress accents, and names the unsupported set so the gap is a failing test
 * rather than a surprise in someone's exported poster. It asserts today's
 * behaviour; it does not endorse it.
 *
 * **The decision this needs is not made here.** Three ways out, none of them
 * this test's to pick: reject a title the face cannot draw (BCR-0007 already
 * established that a missing font fails loudly, and this is the same class of
 * problem one layer down); bundle a fallback face; or accept platform-dependent
 * output and say so. Until then the honest state is "Latin-1 plus punctuation",
 * and this file is where that is written down.
 *
 * See `specs/007-renderer-export/finding-unsupported-glyphs.md`.
 */
import { describe, expect, it } from "bun:test";
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";

const POSTER_FONT = new URL(
  "../../../../assets/fonts/CormorantGaramond.ttf",
  import.meta.url,
).pathname;
if (!GlobalFonts.has("Cormorant Garamond")) {
  const registered = GlobalFonts.registerFromPath(POSTER_FONT, "Cormorant Garamond");
  if (registered === null) {
    throw new Error(
      `could not register the bundled poster font at ${POSTER_FONT}; ` +
        "coverage would be measured against a fallback",
    );
  }
}

const context = createCanvas(64, 64).getContext("2d");
context.font = "48px 'Cormorant Garamond'";

/**
 * A character is missing when it advances exactly like U+FFFF.
 *
 * Advance equality is the test rather than a pixel diff because a notdef box is
 * a *shape*, not a blank: rasterising and comparing would also pass on a glyph
 * that merely looks similar. Advance is what the layout maths sees, so it is
 * also what would break the caption-width constraint.
 */
function isMissing(character: string): boolean {
  const NOTDEF = "￿"; // U+FFFF
  return (
    Math.abs(context.measureText(character).width - context.measureText(NOTDEF).width) <
    0.01
  );
}

describe("poster face glyph coverage (T040 charter C1)", () => {
  it("covers the accents and punctuation the caption and titles actually use", () => {
    // Every non-ASCII character the product can emit today. The caption
    // formatter is the source: degrees signs, an em dash, a middot, and any
    // accented letter a place name or title may carry.
    const required = [
      "°", // ° in "23.5500°S"
      "—", // — between coordinates and place
      "·", // · before the local time
      "á", "à", "â", "ã", "ä", "å", // Portuguese and Nordic
      "é", "è", "ê", "ë", // French
      "í", "ì", "î", "ï", // Spanish/Italian
      "ó", "ò", "ô", "õ", "ö", // Portuguese/Swedish
      "ú", "ù", "û", "ü", // German/Swedish
      "ñ", // Spanish
      "ç", // French/Portuguese
      "ø", // Danish/Norwegian
      "ß", // German
      "Æ", "æ", "Ø", // Danish/Norwegian
      "Ł", "ł", // Polish
      "’", // curly apostrophe in a place name
    ];
    const missing = required.filter(isMissing);
    expect(missing, "the poster face must cover Latin-1 accents").toEqual([]);
  });

  it("covers the plain ASCII the UI is built from", () => {
    // An explicit array rather than spreading a string: iterating a string with
    // `[...]` splits astral characters into surrogates, which is a real hazard
    // in a test whose whole subject is characters, and the linter is right to
    // flag it. Each entry here is a single code point by construction.
    const missing = ASCII.filter(isMissing);
    expect(missing, "the poster face must cover plain ASCII").toEqual([]);
  });

  it("does NOT cover emoji or CJK — the known, reported gap", () => {
    // If this fails, the face gained those glyphs (or a fallback was added):
    // update the finding, because the three output formats would then agree and
    // the product decision recorded there could be taken back.
    const knownGaps = ["🌌", "✨", "🌙", "東", "京"];
    const stillMissing = knownGaps.filter(isMissing);
    expect(
      stillMissing,
      "the poster face now covers these; the C1 finding is stale — update it " +
        "and reconsider whether titles need rejecting",
    ).toEqual(knownGaps);
  });

  it("measures notdef and a real glyph differently, or the probe is useless", () => {
    // A guard on the guard: if the notdef advance ever equalled 'N', every
    // assertion above would pass vacuously.
    expect(isMissing("￿")).toBe(true);
    expect(isMissing("N")).toBe(false);
    expect(isMissing("é")).toBe(false);
  });
});

/**
 * Every printable ASCII character the UI can emit, one code point per entry.
 *
 * A list rather than a string that gets iterated: spreading or splitting a
 * string breaks astral characters into lone surrogates, which in a test whose
 * entire subject is characters is the one bug that would make every assertion
 * below meaningless.
 */
const ASCII: readonly string[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", " ", ".", ",", ":", ";", "·", "—", "°", "'", '"', "(", ")", "[", "]", "-", "–", "/", "#", "%", "&", "*", "+", "=", "/", "\\",
];
