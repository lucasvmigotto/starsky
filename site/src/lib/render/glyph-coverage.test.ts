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
import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import { formatLocalTime } from "../caption.ts";
import { enUS } from "../../i18n/en-US.ts";
import { ptBR } from "../../i18n/pt-BR.ts";
import { posterFontHasGlyph } from "./glyph-coverage.generated.ts";

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
 * Every character a pt-BR poster draws or a pt-BR interface shows (018 FR-007).
 *
 * The caption's date, formatted by `Intl` for every month (the month
 * abbreviations "jan." to "dez." and the "de" between them), and the accented
 * letters Portuguese titles and places carry. Code points, so an astral
 * character could not split into surrogates.
 */
const PT_BR_LETTERS: readonly string[] = [
  "ç", "ã", "õ", "á", "é", "í", "ó", "ú", "â", "ê", "ô", "à", "ü",
  "Ç", "Ã", "Õ", "Á", "É", "Í", "Ó", "Ú", "Â", "Ê", "Ô", "À",
];

function ptBrCaptionCharacters(): string[] {
  const dates = Array.from({ length: 12 }, (_, month) =>
    formatLocalTime(new Date(Date.UTC(2025, month, 28, 21, 45)).toISOString(), "America/Sao_Paulo", "pt-BR"),
  );
  return [...new Set([...Array.from(dates.join("")), ...PT_BR_LETTERS])].filter((c) => c !== " ");
}

/** Code points in a `unicode-range` list (`U+0000-00FF, U+0131, ...`). */
function inUnicodeRange(range: string, code: number): boolean {
  return range.split(",").some((part) => {
    const [start = "", end = start] = part.trim().replace(/^U\+/i, "").split("-");
    return code >= parseInt(start, 16) && code <= parseInt(end, 16);
  });
}

describe("pt-BR glyph coverage (018 FR-007)", () => {
  it("reads the month abbreviations the caption formatter actually produces", () => {
    const chars = ptBrCaptionCharacters().join("");
    for (const letter of ["j", "f", "v", "z", "."]) expect(chars).toContain(letter);
  });

  it("the poster face draws every character of a pt-BR caption and title", () => {
    const characters = ptBrCaptionCharacters();
    expect(characters.filter(isMissing), "measured on the registered face").toEqual([]);
    expect(
      characters.filter((c) => !posterFontHasGlyph(c.codePointAt(0) ?? 0)),
      "per the generated cmap table the browser checks titles against",
    ).toEqual([]);
  });

  it("the PDF subset embeds every character of a pt-BR caption and title", () => {
    // jsPDF embeds this subset, not the face: a glyph missing here is a blank
    // in the exported PDF even though the PNG and SVG draw it.
    const subset = readFileSync(new URL("../../../public/fonts/CormorantGaramond-subset.ttf", import.meta.url));
    const covered = new Set(cmapCodePoints(subset));
    expect(ptBrCaptionCharacters().filter((c) => !covered.has(c.codePointAt(0) ?? 0))).toEqual([]);
  });

  it("Inter, the interface face, covers every character of both catalogues", () => {
    // `index.css` bundles Inter's latin subset only; a character outside its
    // `unicode-range` would fall back to another face mid-sentence.
    const css = readFileSync(new URL("../../index.css", import.meta.url), "utf-8");
    const block = /font-family: "Inter Variable";[\s\S]*?unicode-range:([^;]+);/.exec(css);
    const range = block?.[1] ?? "";
    expect(range).not.toBe("");
    const text = [...Object.values(enUS), ...Object.values(ptBR)].join("");
    const outside = [...new Set(text)].filter((c) => !inUnicodeRange(range, c.codePointAt(0) ?? 0));
    expect(outside).toEqual([]);
  });
});

/**
 * The code points a TrueType `cmap` maps (formats 4 and 12), read directly so
 * the test needs no font library. Mirrors `scripts/generate_glyph_coverage.py`.
 */
function cmapCodePoints(font: Buffer): number[] {
  const tables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i += 1) {
    const record = 12 + i * 16;
    if (font.toString("latin1", record, record + 4) === "cmap") cmap = font.readUInt32BE(record + 8);
  }
  if (cmap < 0) throw new Error("the subset has no cmap");
  const points: number[] = [];
  const subtables = font.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i += 1) {
    const offset = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = font.readUInt16BE(offset);
    if (format === 4) {
      const segments = font.readUInt16BE(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let s = 0; s < segments; s += 1) {
        const end = font.readUInt16BE(ends + s * 2);
        const start = font.readUInt16BE(starts + s * 2);
        const delta = font.readUInt16BE(deltas + s * 2);
        const rangeOffset = font.readUInt16BE(ranges + s * 2);
        for (let code = start; code <= end && code !== 0xffff; code += 1) {
          let glyph: number;
          if (rangeOffset === 0) glyph = (code + delta) & 0xffff;
          else {
            const at = ranges + s * 2 + rangeOffset + (code - start) * 2;
            const raw = font.readUInt16BE(at);
            glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
          }
          if (glyph !== 0) points.push(code);
        }
      }
    } else if (format === 12) {
      const groups = font.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g += 1) {
        const group = offset + 16 + g * 12;
        const start = font.readUInt32BE(group);
        const end = font.readUInt32BE(group + 4);
        const firstGlyph = font.readUInt32BE(group + 8);
        for (let code = start; code <= end; code += 1) if (firstGlyph + (code - start) !== 0) points.push(code);
      }
    }
  }
  return points;
}

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
