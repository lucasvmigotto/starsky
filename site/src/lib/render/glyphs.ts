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
 * ## How drawability is decided: measure, do not ask
 *
 * The obvious tool is `document.fonts.check('1em "Cormorant Garamond"', ch)`.
 * **It does not work**, and it fails in the most misleading direction possible:
 * Chrome treats the question as "can *any* available font render this", so on a
 * machine with an emoji font installed it answers *yes* for 🌌 — true of the
 * desktop, false of the artefact. That is precisely the disagreement this module
 * exists to report, answered backwards. Measured in CI on 2026-10-02: with a
 * shared title of `E2E 🌌 Night`, `check()` reported the emoji as drawable and
 * no adjustment was made.
 *
 * So this measures instead. A canvas is asked to set the face *alone* — no
 * `serif` fallback in the list — and the character's advance is compared with
 * the font's notdef advance (U+FFFF, near-certainly absent). A missing glyph
 * advances exactly like notdef; a present one does not.
 *
 * Advance rather than pixels, deliberately: a notdef box is a *shape*, so
 * rasterising and comparing would also pass on a glyph that merely resembles
 * one. Advance is what the caption-width constraint does its arithmetic on, so
 * it is also the failure that would actually distort a poster.
 *
 * ## The font must be loaded first
 *
 * A face still loading measures as notdef for every character, so a caller that
 * probes too early refuses every title — including plain ASCII ones.
 * `fontsReady()` exists so callers can await the load; the unit suite injects a
 * probe instead and never touches `document` or a canvas.
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
/** The size used for measuring. Only the ratio matters, not the value. */
const PROBE_SIZE_PX = 48;

/** U+FFFF: a code point no font is expected to have. */
const NOTDEF = "￿";

/** Lazily built, so importing this module never touches a canvas. */
let context: CanvasRenderingContext2D | null | undefined;

function measuringContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx === null) return null;
    // The face ALONE. With `serif` appended, the browser falls back for a
    // missing glyph and measures the substitute — reporting the emoji as
    // drawable, which is the bug `document.fonts.check` has.
    ctx.font = `${String(PROBE_SIZE_PX)}px "Cormorant Garamond"`;
    // Only cache once the face is actually applied. A canvas created before the
    // font resolves keeps measuring in the fallback, and caching that would pin
    // every later probe to the wrong typeface — see the self-check in
    // `fontCanDraw`, which is what catches it if this ever regresses.
    if (!ctx.measureText("N").width) {
      return null;
    }
    context = ctx;
    return context;
  } catch {
    context = null;
    return null;
  }
}

/**
 * The default probe: can the poster face, on its own, render this character?
 *
 * Returns `true` for everything when there is no canvas or no measurable font,
 * so a caller that cannot answer degrades to today's behaviour — render, and let
 * the notdef show — rather than locking the product out. Refusing a title is the
 * worse failure: one visitor cannot make a poster, versus one poster with a box
 * in it. Note this needs `fontsReady()` first, or every character measures as
 * notdef and every title is refused.
 */
export function fontCanDraw(character: string): boolean {
  if (typeof document === "undefined") return true;
  const ctx = measuringContext();
  if (ctx === null) return true;
  try {
    // **Self-check first.** If a plain ASCII letter measures as notdef, the
    // measurement is not telling us about the font — the canvas is measuring in
    // a fallback, or the face is not applied yet — and every answer from it is
    // noise. Measured in CI on 2026-10-02: exactly this, reporting `h`, `S` and
    // `u` of "E2E Night" / "Times Square" as undrawable while `N`, `i`, `g` and
    // `t` in the same string measured fine. That is not a coverage answer, and
    // acting on it stripped the letters out of every title on the page.
    //
    // So when the probe cannot be trusted, it reports *drawable* for
    // everything: the visitor gets today's behaviour (a poster with a box in it)
    // rather than a mangled title. Failing open is right here because the
    // alternative is destroying input that was fine.
    if (measuresAsNotdef(ctx, "N")) return true;

    return !measuresAsNotdef(ctx, character);
  } catch {
    return true;
  }
}

/** True when `character` advances exactly like the font's notdef glyph. */
function measuresAsNotdef(ctx: CanvasRenderingContext2D, character: string): boolean {
  return (
    Math.abs(ctx.measureText(character).width - ctx.measureText(NOTDEF).width) <=
    // Sub-pixel: a present glyph can sit within a hair of notdef, but the two
    // are never equal to the precision measureText returns.
    0.01
  );
}

/** Resolve once the poster face is loaded, so `fontCanDraw` is not guessing. */
export async function fontsReady(): Promise<void> {
  if (typeof document === "undefined") return;
  // Typed as always present, so the check has to be runtime-shaped: a browser
  // without the Font Access API has no `fonts.ready` to await, and awaiting
  // `undefined` would settle immediately and leave the probe measuring an
  // unloaded face.
  const ready = (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
  if (!ready) return;
  try {
    await ready;
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
