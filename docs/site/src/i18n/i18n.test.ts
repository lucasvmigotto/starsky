/**
 * UI chrome i18n: every key resolves in both locales, interpolation works,
 * and the two catalogues never drift apart.
 */
import { describe, expect, it } from "bun:test";
import { t, uiKeys } from "./index.ts";
import { uiEn, uiPt } from "./locales.ts";

describe("ui i18n", () => {
  it("resolves every key in both locales to real copy", () => {
    for (const key of uiKeys()) {
      // footer.version carries a {version} slot by design; interpolation
      // is covered below. Here: no empty strings, no missing keys.
      expect(t("en", key).length).toBeGreaterThan(0);
      expect(t("pt", key).length).toBeGreaterThan(0);
    }
  });

  it("keeps both catalogues on the same key set", () => {
    expect(Object.keys(uiPt).sort()).toEqual(Object.keys(uiEn).sort());
  });

  it("interpolates the version slot", () => {
    expect(t("en", "footer.version", { version: "1.1.1" })).toBe(
      "starsky docs v1.1.1",
    );
    expect(t("pt", "footer.version", { version: "1.1.1" })).toContain("1.1.1");
  });

  it("names the maturity states distinctly per locale", () => {
    expect(t("en", "maturity.Planned")).toContain("Planned");
    expect(t("pt", "maturity.Planned")).toContain("Planejado");
  });
});
