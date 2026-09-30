import { describe, expect, it } from "bun:test";
import { bytesToBase64Url, canonicalJson, encodePayload } from "./encode.ts";
import { decodeShareFragment, type SharePayload } from "./share.ts";

/**
 * Cross-language vector: fragment generated with the repo Python encoder
 * (`starsky.share.spec.encode_payload`) for the payload below
 * (lat 40.7580, lon -73.9855, Times Square, 2026-01-01T00:00:00Z, UTC,
 * all render defaults, title "Our Night"). Coincidentally identical to the
 * decode VECTOR in `share.test.ts`.
 */
const PYTHON_FRAGMENT =
  "eNpVjk1PwzAMhv9K5XNWZYOykSv3cVh3gEsVMtN6pElJXKox7b_jjg8JyZKtx6_s5wzeMphbXa6rjQIfA5jF-qa831SVgjgwxZDBnMFJZ_SSFtJ4-4JeOKcR1f_dH32l3OEJm8wJQ8sdmGWpFbQ-Tr-ReW4oMIZMfPoJ9LYNxOMBG089iVxVillPock42HR9AkaXWgseUjyi-0YgEgljm-zQkQMFubMDCneUnEcBTOxn8DimYkttx3CRE966GdbUYy5276NNqIotTsVTTG-q2IsNHoodW8Y8H_mU8L5-kPFDlBVMHYZmZCd4pVd3C72UqrU213qGyxfuaHRl";

const VECTOR_PAYLOAD: SharePayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square, New York, United States",
  when_utc: "2026-01-01T00:00:00Z",
  tz: "UTC",
  options: {
    projection: "stereographic",
    fisheye_strength: 1.0,
    min_separation: 0.008,
    magnitude_limit: 5.8,
    glow: true,
    glow_intensity: 1.0,
    constellations: true,
    constellation_labels: true,
    shape: "circle",
    title: "Our Night",
  },
};

describe("canonicalJson", () => {
  it("sorts keys recursively with compact separators", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3.0,"d":2.0},"b":1.0}',
    );
  });

  it("renders integer floats Python-style", () => {
    expect(canonicalJson({ x: 1.0 })).toBe('{"x":1.0}');
    expect(canonicalJson({ x: 0.008 })).toBe('{"x":0.008}');
    expect(canonicalJson({ x: null })).toBe('{"x":null}');
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalJson(Number.NaN)).toThrow();
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("bytesToBase64Url", () => {
  it("uses the url-safe alphabet without padding", () => {
    const bytes = new Uint8Array([251, 255, 190, 239, 62]);
    expect(bytesToBase64Url(bytes)).toBe("-_--7z4");
  });
});

describe("encodePayload", () => {
  it("is byte-identical to the Python encoder output", () => {
    expect(encodePayload(VECTOR_PAYLOAD)).toBe(PYTHON_FRAGMENT);
  });

  it("round-trips through decodeShareFragment", () => {
    const payload: SharePayload = {
      ...VECTOR_PAYLOAD,
      lat: -33.8688,
      lon: 151.2093,
      place: null,
      when_utc: "1998-11-17T02:17:00Z",
      tz: "Australia/Sydney",
      options: { ...VECTOR_PAYLOAD.options, projection: "fisheye", title: null },
    };
    expect(decodeShareFragment(encodePayload(payload))).toEqual(payload);
  });
});
