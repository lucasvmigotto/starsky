/**
 * Which characters the bundled poster face can draw.
 *
 * The poster is set in Cormorant Garamond (`poster.ts`), which covers Latin-1
 * accents and punctuation but has **no glyph** for emoji or CJK. Nothing about
 * that fails loudly: the missing glyph falls through the `"Cormorant Garamond",
 * serif` stack to a generic family that has no emoji either, and the render
 * succeeds with a notdef box in it. The three exports then disagree about the
 * same title — the PNG bakes the box in permanently, the SVG carries the
 * character for the reader's viewer to resolve, and the PDF has no outline to
 * subset. Found by charter C1/C2; see
 * `specs/007-renderer-export/finding-unsupported-glyphs.md`.
 *
 * ## Why a generated table and not the browser
 *
 * Two browser probes were tried first. **Both were wrong, silently, in opposite
 * directions**, and the reasoning is the point:
 *
 * 1. `document.fonts.check('1em "Cormorant Garamond"', ch)` asks whether *any*
 *    available font can render the character. On a machine with an emoji font —
 *    which CI's Playwright image has — it answers *yes* for 🌌, so the feature
 *    did nothing where it mattered.
 * 2. Measuring each character's advance against the notdef advance (`U+FFFF`)
 *    worked until it was gated on the face being loaded. Probing before the
 *    canvas honoured the family measures a *fallback*, and a fallback reports
 *    the narrowest glyphs as missing: `E2E Night` came back as `h`, `S`, `u` —
 *    letters, 0.2–0.8 px short of notdef — and the feature ate them out of
 *    every title on the page.
 *
 * A self-check could not rescue (2). It detects "everything is missing", and `N`
 * measured fine while its neighbours did not.
 *
 * So the question is answered from the font's own `cmap`, at build time, into a
 * generated constant (`glyph-coverage.generated.ts`). Three things follow, and
 * each is the lesson of the two failures: **no load race**, so nothing to race;
 * **no fallback chain**, so nothing to fall back into; and **the same constant
 * in the browser and under bun**, so the client and its tests cannot disagree —
 * which is what made both failures invisible to a green unit suite.
 */
import { t } from "../../i18n/index.ts";
import { posterFontHasGlyph } from "./glyph-coverage.generated.ts";

/** Can the poster face draw this character? */
export function fontCanDraw(character: string): boolean {
  const code = character.codePointAt(0);
  if (code === undefined) return true;
  // Whitespace and control characters are positioned by the renderer rather than
  // drawn by the face, and appear in no `cmap`. Reporting them as undrawable
  // would strip the spaces out of every title.
  if (code <= 0x20 || (code >= 0x7f && code <= 0xa0)) return true;
  return posterFontHasGlyph(code);
}

/** Distinct characters, in first-appearance order. */
export function uniqueCharacters(text: string): string[] {
  return [...new Set(text)];
}

/**
 * The characters in `text` the poster face cannot draw, in the order they
 * appear. Empty means the whole string is drawable.
 */
export function unsupportedInPosterFont(text: string): string[] {
  return uniqueCharacters(text).filter((character) => !fontCanDraw(character));
}

/**
 * Drop every undrawable character from a title.
 *
 * Used on the **decode** path, for a link somebody else made: the recipient
 * cannot fix the sender's title, and a link that refuses to render is a worse
 * failure than a title that lost a character. Returns `null` when nothing is
 * droppable or nothing survives, so the caller can tell "unchanged" from
 * "emptied" — an emptied title becomes untitled rather than a blank line.
 */
export function stripUnsupported(text: string): string | null {
  const unsupported = new Set(unsupportedInPosterFont(text));
  if (unsupported.size === 0) return null;
  // Spreading iterates code points, which is the point: an emoji is one
  // character, and filtering by UTF-16 unit would leave a lone surrogate.
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  const kept = [...text].filter((character) => !unsupported.has(character)).join("");
  // Collapse the gap the removal leaves. "Noite 🌌 Austral" stripped naively is
  // "Noite  Austral" — a double space, which reads on the poster as a mistake
  // in the sender's typing rather than as our adjustment.
  return kept.replace(/\s+/g, " ").trim();
}

// The form-side message names the character so the visitor can act on it.
export function unsupportedCharacterMessage(character: string): string {
  return t("fontError.titleUnsupported", { character });
}

/** The decode-side message: says the title arrived adjusted, and what was lost. */
export function titleAdjustedMessage(removed: readonly string[]): string {
  return t("fontError.titleAdjusted", { characters: removed.join(" ") });
}
