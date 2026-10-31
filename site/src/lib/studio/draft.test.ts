import { describe, expect, it } from "bun:test";
import { encodePayload } from "../encode.ts";
import { type SharePayload, ShareDecodeError, ShareVersionError, decodeShareFragment, fragmentFromHash } from "../share.ts";
import { SAMPLE_FRAGMENTS } from "../site.ts";
import { adjustUndrawable, decodeDraft, draftHash, encodeDraft, studioFragmentFromHash } from "./draft.ts";

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

describe("adjustUndrawable (what the Viewer does with a title it cannot draw)", () => {
  it("leaves a drawable draft alone", () => {
    const result = adjustUndrawable(PAYLOAD);
    expect(result.payload).toBe(PAYLOAD);
    expect(result.removed).toEqual([]);
  });

  it("drops undrawable characters from the title and reports them", () => {
    const result = adjustUndrawable({ ...PAYLOAD, options: { ...PAYLOAD.options, title: "Noite \u{1F30C} Austral" } });
    expect(result.payload.options.title).toBe("Noite Austral");
    expect(result.removed).toEqual(["\u{1F30C}"]);
  });

  it("empties a title that is only undrawable, leaving it untitled", () => {
    const result = adjustUndrawable({ ...PAYLOAD, options: { ...PAYLOAD.options, title: "\u{1F30C}" } });
    expect(result.payload.options.title).toBeNull();
  });

  it("does the same for the place", () => {
    const result = adjustUndrawable({ ...PAYLOAD, place: "Tokyo \u6771\u4EAC" });
    expect(result.payload.place).toBe("Tokyo");
    expect(result.removed).toEqual(["\u6771", "\u4EAC"]);
  });
});
