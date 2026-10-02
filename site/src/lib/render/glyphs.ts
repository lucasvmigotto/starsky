/**
 * Which characters the bundled poster face can actually draw.
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
 * ## Why `document.fonts.check` and not a hard-coded list
 *
 * The face is the source of truth, and querying it means a future font swap
 * needs no change here. The subtle part is **which family to ask about**:
 *
 *     check('1em "Cormorant Garamond"', ch)   ← what we mean
 *     check('1em "Cormorant Garamond", serif', ch)   ← what the poster uses
 *
 * The second form also consults the generic fallback, so on any machine with an
 * emoji font installed it answers "yes, 🌌 is fine" — which is exactly the
 * disagreement we are trying to surface, reported in the wrong direction. Ask
 * about the face alone and the answer is about the artefact we actually ship.
 *
 * ## The font must be loaded first
 *
 * `check()` reports what is *available now*. A face still loading answers
 * "unsupported" for every character, so a caller that probes too early rejects
 * every title — including plain ASCII ones. `fontsReady()` exists so callers
 * can await the load; the unit suite injects a probe instead and never touches
 * `document`.
 */
import { t } from "../../i18n/index.ts";

/** One character's drawability, as reported by the browser. */
export type GlyphProbe = (character: string) => boolean;

/** Distinct characters, in first-appearance order. */
export function uniqueCharacters(text: string): string[] {
  return [...new Set(text)];
}

/**
 * The default probe: can the poster face, on its own, render this character?
 *
 * Returns `true` for everything when the platform has no Font Access API, so a
 * browser that cannot answer degrades to today's behaviour (render, and let the
 * notdef show) rather than locking the product out. Rejecting a title is the
 * worse failure of the two: one visitor cannot make a poster, versus one poster
 * with a box in it.
 */
export function fontCanDraw(character: string): boolean {
  // `typeof document` covers non-browser callers (bun, SSR); the try covers a
  // browser with no Font Access API, where calling `.check` throws. Both fall
  // back to today's behaviour — render, and let the notdef show — because
  // rejecting a title is the worse failure: one visitor cannot make a poster,
  // versus one poster with a box in it.
  if (typeof document === "undefined") return true;
  try {
    // The face alone — never the `serif` fallback. See the module docstring.
    return document.fonts.check('1em "Cormorant Garamond"', character);
  } catch {
    return true;
  }
}

/** Resolve once the poster face is loaded, so `fontCanDraw` is not guessing. */
export async function fontsReady(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    await document.fonts.ready;
  } catch {
    // A font that never loads is BCR-0007's case, handled where it renders.
  }
}

/**
 * The characters in `text` the poster face cannot draw, in the order they
 * appear. Empty means the whole string is drawable.
 */
export function unsupportedInPosterFont(
  text: string,
  probe: GlyphProbe = fontCanDraw,
): string[] {
  return uniqueCharacters(text).filter((character) => !probe(character));
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
export function stripUnsupported(
  text: string,
  probe: GlyphProbe = fontCanDraw,
): string | null {
  const unsupported = new Set(unsupportedInPosterFont(text, probe));
  if (unsupported.size === 0) return null;
  // Spreading a string iterates *code points*, which is the whole point: an
  // emoji is one character, and filtering it by UTF-16 unit would leave a lone
  // surrogate behind. The lint rule that objects here is guarding against
  // exactly the bug this avoids.
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  const kept = [...text].filter((character) => !unsupported.has(character)).join("");
  // Collapse the gap the removal leaves. "Noite 🌌 Austral" stripped naively is
  // "Noite  Austral" — a double space, which reads on the poster as a mistake in
  // the sender's typing rather than as our adjustment. Whitespace the sender
  // did write is kept, as one space.
  return kept.replace(/\s+/g, " ").trim();
}

/** The form-side message: names the character so the visitor can act on it. */
export function unsupportedCharacterMessage(character: string): string {
  return t("fontError.titleUnsupported", { character });
}

/** The decode-side message: says the title arrived adjusted, and what was lost. */
export function titleAdjustedMessage(removed: readonly string[]): string {
  return t("fontError.titleAdjusted", { characters: removed.join(" ") });
}
