/**
 * The caption's locale is always explicit (spec 017, 018 FR-006).
 *
 * The poster passes its link's language, the interface the active locale; the
 * browser's default never decides. Bun's default locale is always en-US (it
 * ignores `LANG`), so the browser-locale regression itself is caught by
 * `e2e/j2-share-link.spec.ts` and `e2e/pt-br.spec.ts`, which run in pt-BR
 * contexts.
 */
import { describe, expect, it } from "bun:test";
import { DEFAULT_POSTER_LOCALE, formatDetailLine, formatLocalTime } from "./caption.ts";

describe("caption locale", () => {
  it("defaults the poster to en-US, so a link without lang draws what it always drew", () => {
    expect(DEFAULT_POSTER_LOCALE).toBe("en-US");
  });

  it("formats the local time in en-US in the place's zone", () => {
    expect(formatLocalTime("2024-12-25T10:00:00Z", "Australia/Sydney", "en-US")).toBe(
      "Dec 25, 2024, 9:00 PM Australia/Sydney",
    );
  });

  it("formats the local time in pt-BR when asked, with the same zone name", () => {
    expect(formatLocalTime("2024-12-25T10:00:00Z", "Australia/Sydney", "pt-BR")).toBe(
      "25 de dez. de 2024, 21:00 Australia/Sydney",
    );
  });

  it("falls back to UTC, still in the asked locale, for an unknown zone", () => {
    expect(formatLocalTime("2024-12-25T10:00:00Z", "Not/AZone", "en-US")).toBe(
      "Dec 25, 2024, 10:00 AM UTC",
    );
    expect(formatLocalTime("2024-12-25T10:00:00Z", "Not/AZone", "pt-BR")).toBe(
      "25 de dez. de 2024, 10:00 UTC",
    );
  });

  it("keeps the detail-line template, localizing only the date", () => {
    expect(
      formatDetailLine(-33.8688, 151.2093, "Sydney", "2024-12-25T10:00:00Z", "Australia/Sydney", "en-US"),
    ).toBe("33.8688°S, 151.2093°E — Sydney · Dec 25, 2024, 9:00 PM Australia/Sydney");
    expect(
      formatDetailLine(-23.5505, -46.6333, "São Paulo", "2024-12-25T10:00:00Z", "America/Sao_Paulo", "pt-BR"),
    ).toBe("23.5505°S, 46.6333°W — São Paulo · 25 de dez. de 2024, 07:00 America/Sao_Paulo");
  });
});
