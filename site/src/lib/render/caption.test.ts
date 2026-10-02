/**
 * Caption fitting (BCR-0010).
 *
 * The defect: the caption is centred in a band exactly `sizePx` wide and was
 * drawn with no width constraint, so a long detail line — a full
 * `display_name`, an IANA zone — ran off both edges and lost its leading
 * coordinates.
 *
 * These tests assert the *fix*, so regenerating the reference fixtures cannot
 * quietly bless a regression: if the caption ever stops fitting again, these
 * fail regardless of what the stored PNGs say.
 */
import { describe, expect, it } from "bun:test";
import { posterGeometry } from "./poster.ts";
import {
  CAPTION_INNER_WIDTH_FRACTION,
  captionMaxWidth,
  estimateTextWidth,
  fitCaption,
  SVG_LENGTH_ADJUST,
} from "./caption.ts";
import { formatDetailLine } from "../caption.ts";
import type { SharePayload } from "../share.ts";

const LONG_PLACE = "Times Square, New York, United States";
const LONG_TZ = "America/New_York";

/**
 * The detail line's font size in CSS pixels, which is what actually matters.
 *
 * `render-spec.json` pins sizes in **points** and requires
 * `px = pt * referenceDpi / 72` (150 dpi, so 10.5pt -> 21.88px). That value is
 * fixed and does *not* scale with the poster, while the band does — which is
 * why small posters are the worst case rather than large ones.
 */
const DETAIL_PX = (10.5 * 150) / 72;

function payload(over: Partial<SharePayload> = {}): SharePayload {
  return {
    v: 1,
    lat: 40.758,
    lon: -73.9855,
    place: LONG_PLACE,
    when_utc: "2026-01-01T05:00:00Z",
    tz: LONG_TZ,
    options: {
      projection: "stereographic",
      fisheye_strength: 1,
      min_separation: 0.008,
      magnitude_limit: 4.5,
      glow: true,
      glow_intensity: 1,
      constellations: true,
      constellation_labels: true,
      shape: "circle",
      title: "New Year over Manhattan",
    },
    ...over,
  };
}

function detailFor(p: SharePayload): string {
  return formatDetailLine(p.lat, p.lon, p.place, p.when_utc, p.tz);
}

describe("caption fitting (BCR-0010)", () => {
  it("leaves room at both edges of the band", () => {
    const size = 1400;
    expect(captionMaxWidth(size)).toBeCloseTo(size * CAPTION_INNER_WIDTH_FRACTION, 5);
    expect(captionMaxWidth(size)).toBeLessThan(size);
  });

  it("scales a caption that would overflow, so it fits", () => {
    const size = 1400;
    const max = captionMaxWidth(size);
    const fontPx = 18;
    // A measurer that reports a 2x-too-wide string.
    const measure = (text: string, px: number): number => text.length * px * 0.9;
    const fitted = fitCaption("a".repeat(200), fontPx, max, measure);
    expect(fitted.fontSizePx).toBeLessThan(fontPx);
    const after = measure("a".repeat(200), fitted.fontSizePx);
    expect(after).toBeLessThanOrEqual(max);
  });

  it("never shrinks a caption that already fits", () => {
    const measure = (text: string, px: number): number => text.length * px * 0.2;
    const fitted = fitCaption("short", 18, 1300, measure);
    // The spec's font sizes are normative; fitting must not move them.
    expect(fitted.fontSizePx).toBe(18);
  });

  it("never shrinks below a legible floor", () => {
    const measure = (): number => 1e9;
    const fitted = fitCaption("x", 18, 10, measure);
    expect(fitted.fontSizePx).toBeGreaterThanOrEqual(6);
  });

  it("handles a degenerate measurement without dividing by zero", () => {
    const fitted = fitCaption("x", 18, 100, () => 0);
    expect(fitted.fontSizePx).toBe(18);
  });

  it("reproduces the defect: the long detail line overflows the band", () => {
    // Guards the premise of the BCR. The font is fixed in points while the band
    // scales with the poster, so *small* posters clip — including the 320px
    // mobile export and the on-screen preview.
    const detail = detailFor(payload());
    expect(detail).toContain(LONG_PLACE);
    expect(detail).toContain(LONG_TZ);
    for (const size of [320, 480, 640, 800, 1024]) {
      expect(
        estimateTextWidth(detail, DETAIL_PX),
        `expected the caption to overflow at ${String(size)}px`,
      ).toBeGreaterThan(captionMaxWidth(size));
    }
  });

  it("scales that same line down to fit, at every size that clipped", () => {
    const detail = detailFor(payload());
    for (const size of [320, 480, 640, 800, 1024]) {
      const fitted = fitCaption(
        detail,
        DETAIL_PX,
        captionMaxWidth(size),
        estimateTextWidth,
      );
      // Tolerance: the fit is computed by division, so the result can land a
      // few ULPs past the boundary. Being off by 5e-14 is not an overflow.
      expect(
        estimateTextWidth(detail, fitted.fontSizePx),
        `expected the caption to fit at ${String(size)}px`,
      ).toBeLessThanOrEqual(captionMaxWidth(size) + 1e-6);
      // Uniform scale, so the string itself is never truncated.
      expect(fitted.fontSizePx).toBeGreaterThan(0);
    }
    // The coordinates are what identifies the moment; they must survive.
    expect(detail).toContain("40.7580°N");
  });

  it("leaves a large poster at its specified font size", () => {
    // The spec's sizes are normative, so fitting must not shrink what already
    // fits — otherwise every poster would render slightly smaller than pinned.
    const detail = detailFor(payload());
    const fitted = fitCaption(detail, DETAIL_PX, captionMaxWidth(1400), estimateTextWidth);
    expect(fitted.fontSizePx).toBeCloseTo(DETAIL_PX, 5);
  });

  it("uses spacingAndGlyphs so SVG matches canvas maxWidth", () => {
    // Canvas `maxWidth` scales glyphs horizontally. `spacing` alone would
    // produce a PNG and an SVG of one moment that differ.
    expect(SVG_LENGTH_ADJUST).toBe("spacingAndGlyphs");
  });

  it("estimates width proportionally to font size", () => {
    expect(estimateTextWidth("abcd", 10)).toBeCloseTo(
      estimateTextWidth("abcd", 20) / 2,
      5,
    );
  });

  it("keeps the band geometry it was derived from", () => {
    const geometry = posterGeometry(1000);
    expect(geometry.sizePx).toBe(1000);
    expect(captionMaxWidth(geometry.sizePx)).toBeCloseTo(940, 5);
  });
});