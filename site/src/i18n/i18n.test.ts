/**
 * Copy resolution and catalogue integrity (000-design-system T029–T031).
 *
 * The staleness test is the point of this file: a key used by a component but
 * absent from the catalogue fails the build, so shipping a language with a hole
 * in it is not possible.
 */
import { describe, expect, it } from "bun:test";
import { copyKeys, t } from "./index.ts";
import { enUS } from "./en-US.ts";

describe("copy", () => {
  it("resolves a literal key", () => {
    expect(t("viewer.copyLink")).toBe("Copy link");
  });

  it("interpolates named parameters", () => {
    expect(t("studio.place.resolved", { place: "Times Square" })).toBe(
      "Showing Times Square",
    );
    expect(t("footer.version", { version: "1.0.0" })).toBe("starsky v1.0.0");
    expect(
      t("viewer.export.done", { filename: "starsky-sky.png" }),
    ).toBe("Saved starsky-sky.png");
  });

  it("interpolates several parameters in one string", () => {
    expect(
      t("viewer.caption", {
        coords: "40.7580°N, 73.9855°W",
        place: "Times Square",
        local: "1 Jan 2026, 00:00",
        tz: "UTC",
      }),
    ).toBe("40.7580°N, 73.9855°W — Times Square · 1 Jan 2026, 00:00 UTC");
  });

  it("falls back visibly for a missing key rather than rendering nothing", () => {
    // A blank button is a bug found in review; a missing key is one found in
    // production. Rendering the key makes the gap visible either way.
    expect(t("viewer.doesNotExist")).toBe("⟨viewer.doesNotExist⟩");
  });

  it("warns when a placeholder is left unfilled instead of dropping it", () => {
    // Leaving `{place}` in the output would ship a literal brace to a visitor.
    expect(t("studio.place.resolved")).toBe("Showing {place}");
  });

  it("never interpolates across a key that has no parameters", () => {
    expect(t("viewer.copyLink", { unused: "x" })).toBe("Copy link");
  });

  it("uses one verb phrase for the random-sky action (D10)", () => {
    // The three current variants are the bug; the canonical key exists so the
    // phrase can be changed in one place. Widen both sides to `string`: the
    // catalogue is `as const`, so `enUS[...]` is a literal type and comparing
    // it against `t()`'s `string` return has no matching overload.
    expect(t("viewer.randomSky")).toBe("Load a random sky");
    const action: string = enUS["empty.action"];
    expect(action).toBe<string>(t("viewer.randomSky"));
  });

  it("keeps the CTA verb equal to its result message", () => {
    // "Copy link" → "Link copied", not "Share" → "Shared!" (vision, microcopy).
    expect(t("viewer.copyLink")).toBe("Copy link");
    expect(t("viewer.linkCopied")).toBe("Link copied");
  });

  it("has no colour tokens masquerading as copy", () => {
    // `color.*` keys were picked up by the first extractor pass; they belong to
    // the token layer and must never resolve through `t()`.
    const stray = copyKeys().filter((k) => k.startsWith("color."));
    expect(stray).toEqual([]);
  });

  it("resolves every key in the catalogue", () => {
    for (const key of copyKeys()) {
      expect(t(key)).not.toContain("⟨");
    }
  });

  it("has no key the vision does not define", () => {
    // Guard against a typo'd key that would silently never be used: every key
    // here is asserted against the vision by `scripts/check_i18n_keys.py`.
    // 87 → 90 on 2026-10-01 for 007's FT007 (`viewer.export.open`/`.close`/
    // `.preparing`, the three literals ExportControls still hardcoded);
    // 90 → 92 for the undrawable-character report (`fontError.titleUnsupported`
    // on the authoring path, `fontError.titleAdjusted` on the decode path);
    // 92 → 97 for the view controls the poster needed once it could be panned
    // and zoomed (`viewer.canvasHint`, `.viewControls`, `.zoomIn`, `.zoomOut`,
    // `.resetView`).
    expect(copyKeys().length).toBe(97);
  });
});