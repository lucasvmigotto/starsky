import { describe, expect, it } from "bun:test";
import { DEFAULT_LAYERS, layersFromPayload } from "./layers.ts";

describe("layersFromPayload", () => {
  it("uses the defaults for what the link does not say", () => {
    expect(layersFromPayload({ below: "dimmed" })).toEqual(DEFAULT_LAYERS);
    expect(DEFAULT_LAYERS.equatorialGrid).toBe(false);
    expect(DEFAULT_LAYERS.constellationLabels).toBe(true);
  });

  it("applies the flags the link sets and ignores unknown ones", () => {
    const got = layersFromPayload({ horizon: false, equatorialGrid: true, other: true, below: "hidden" });
    expect(got.horizon).toBe(false);
    expect(got.equatorialGrid).toBe(true);
    expect(got.below).toBe("hidden");
    expect(got.constellationLines).toBe(true);
  });
});
