import { describe, expect, it } from "bun:test";
import { decodeShareFragment } from "./share.ts";
import { randomSampleFragment, SAMPLE_FRAGMENTS } from "./site.ts";

describe("SAMPLE_FRAGMENTS", () => {
  it("all decode to valid v1 payloads", () => {
    expect(SAMPLE_FRAGMENTS.length).toBeGreaterThanOrEqual(5);
    for (const fragment of SAMPLE_FRAGMENTS) {
      const payload = decodeShareFragment(fragment);
      expect(payload.v).toBe(1);
      expect(Number.isFinite(payload.lat)).toBe(true);
      expect(Number.isFinite(payload.lon)).toBe(true);
      expect(payload.when_utc.length).toBeGreaterThan(0);
    }
  });

  it("mixes titled and untitled moments", () => {
    const titles = SAMPLE_FRAGMENTS.map(
      (f) => decodeShareFragment(f).options.title,
    );
    expect(titles.some((t) => typeof t === "string" && t.length > 0)).toBe(true);
    expect(titles.some((t) => t === null)).toBe(true);
  });
});

describe("randomSampleFragment", () => {
  it("returns a set member", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(SAMPLE_FRAGMENTS).toContain(randomSampleFragment());
    }
  });

  it("avoids the excluded fragment when alternatives exist", () => {
    for (const fragment of SAMPLE_FRAGMENTS) {
      expect(randomSampleFragment(fragment)).not.toBe(fragment);
    }
  });
});
