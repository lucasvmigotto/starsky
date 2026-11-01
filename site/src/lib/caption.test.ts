/**
 * The caption is pinned to one locale (artifact determinism, spec 017).
 *
 * Bun's default locale is always en-US (it ignores `LANG`), so these can only
 * hold the exact strings; the browser-locale regression itself is caught by
 * `e2e/j2-share-link.spec.ts`, which runs the Viewer in a pt-BR context.
 */
import { describe, expect, it } from "bun:test";
import { CAPTION_LOCALE, formatDetailLine, formatLocalTime } from "./caption.ts";

describe("caption locale", () => {
  it("is en-US, independent of the visitor's browser", () => {
    expect(CAPTION_LOCALE).toBe("en-US");
  });

  it("formats the local time in en-US in the place's zone", () => {
    expect(formatLocalTime("2024-12-25T10:00:00Z", "Australia/Sydney")).toBe(
      "Dec 25, 2024, 9:00 PM Australia/Sydney",
    );
  });

  it("falls back to UTC, still in en-US, for an unknown zone", () => {
    expect(formatLocalTime("2024-12-25T10:00:00Z", "Not/AZone")).toBe(
      "Dec 25, 2024, 10:00 AM UTC",
    );
  });

  it("keeps the detail-line template", () => {
    expect(
      formatDetailLine(-33.8688, 151.2093, "Sydney", "2024-12-25T10:00:00Z", "Australia/Sydney"),
    ).toBe("33.8688°S, 151.2093°E — Sydney · Dec 25, 2024, 9:00 PM Australia/Sydney");
  });
});
