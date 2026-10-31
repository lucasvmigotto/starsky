import { describe, expect, it } from "bun:test";
import { encodePayload } from "../encode.ts";
import { type SharePayload, ShareDecodeError, ShareVersionError, decodeShareFragment, fragmentFromHash } from "../share.ts";
import { SAMPLE_FRAGMENTS } from "../site.ts";
import { decodeDraft, draftHash, encodeDraft, studioFragmentFromHash } from "./draft.ts";

const PAYLOAD: SharePayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square",
  when_utc: "2026-01-01T00:00:00Z",
  tz: "UTC",
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
    title: "Draft",
  },
};

describe("studioFragmentFromHash", () => {
  it("reads #studio=", () => {
    expect(studioFragmentFromHash("#studio=abc")).toBe("abc");
    expect(studioFragmentFromHash("studio=abc")).toBe("abc");
  });

  it("is null for anything else, including #s= and #e=", () => {
    expect(studioFragmentFromHash("")).toBeNull();
    expect(studioFragmentFromHash("#s=abc")).toBeNull();
    expect(studioFragmentFromHash("#e=abc")).toBeNull();
    expect(studioFragmentFromHash("#studio=")).toBeNull();
    expect(studioFragmentFromHash("#studios=abc")).toBeNull();
  });

  it("is not mistaken for a share fragment, and the reverse", () => {
    expect(fragmentFromHash("#studio=abc")).toBeNull();
    expect(studioFragmentFromHash("#s=abc")).toBeNull();
  });
});

describe("draft codec", () => {
  it("uses the share codec byte for byte, under another prefix", () => {
    expect(encodeDraft(PAYLOAD)).toBe(encodePayload(PAYLOAD));
    expect(draftHash(PAYLOAD)).toBe(`#studio=${encodePayload(PAYLOAD)}`);
  });

  it("round-trips", () => {
    expect(decodeDraft(encodeDraft(PAYLOAD))).toEqual(PAYLOAD);
  });

  it("decodes an old #s= fragment exactly as the Viewer does", () => {
    const fragment = SAMPLE_FRAGMENTS.slice(0, 1).join("");
    expect(decodeDraft(fragment)).toEqual(decodeShareFragment(fragment));
  });

  it("rejects what the share validation rejects, with the same errors", () => {
    const bad = encodePayload({ ...PAYLOAD, options: { ...PAYLOAD.options, magnitude_limit: 9 } });
    expect(() => decodeDraft(bad)).toThrow(ShareDecodeError);
    expect(() => decodeDraft("%%%")).toThrow(ShareDecodeError);
    expect(() => decodeDraft(encodePayload({ ...PAYLOAD, v: 2 }))).toThrow(ShareVersionError);
  });
});
