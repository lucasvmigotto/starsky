import { describe, expect, it } from "bun:test";
import { deflate } from "pako";
import { bytesToBase64Url, canonicalJson } from "../encode.ts";
import {
  type Creation,
  creationFragmentFromHash,
  decodeCreation,
  encodeCreation,
} from "./creation.ts";

/** A fragment built by hand, so a test can send what the encoder never would. */
function raw(value: unknown): string {
  return bytesToBase64Url(deflate(new TextEncoder().encode(canonicalJson(value)), { level: 9, legacyHash: true }));
}

const FULL: Creation = {
  place: "Eiffel Tower, Paris, France",
  lat: 48.8584,
  lon: 2.2945,
  when_local: "2026-01-01T21:30",
  tz: "Europe/Paris",
  title: "Our first flat",
  magnitude_limit: 4.5,
};

function ok(fragment: string): Creation {
  const result = decodeCreation(fragment);
  if (result.status !== "ok") throw new Error("expected ok");
  return result.creation;
}

describe("encode and decode", () => {
  it("round-trips every field", () => {
    expect(ok(encodeCreation(FULL))).toEqual(FULL);
  });

  it("round-trips a partial creation without inventing fields", () => {
    expect(ok(encodeCreation({ title: "Only a title" }))).toEqual({ title: "Only a title" });
    expect(ok(encodeCreation({}))).toEqual({});
  });

  it("keeps a null place with its coordinates", () => {
    const c: Creation = { place: null, lat: -33.8688, lon: 151.2093 };
    expect(ok(encodeCreation(c))).toEqual(c);
  });

  it("is deterministic and url-safe", () => {
    expect(encodeCreation(FULL)).toBe(encodeCreation({ ...FULL }));
    expect(encodeCreation(FULL)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("per-field tolerance", () => {
  it("drops an invalid field and keeps the rest", () => {
    const got = ok(raw({ v: 1, lat: 10, lon: 20, tz: "Mars/Olympus", title: "Kept", magnitude_limit: 99, when_local: "nope" }));
    expect(got).toEqual({ lat: 10, lon: 20, title: "Kept" });
  });

  it("drops latitude and longitude together when either is out of range", () => {
    expect(ok(raw({ v: 1, lat: 95, lon: 20, title: "x" }))).toEqual({ title: "x" });
    expect(ok(raw({ v: 1, lat: 10, lon: 200, title: "x" }))).toEqual({ title: "x" });
    expect(ok(raw({ v: 1, lat: 10, title: "x" }))).toEqual({ title: "x" });
  });

  it("keeps a place only with coordinates", () => {
    expect(ok(raw({ v: 1, place: "Paris" }))).toEqual({});
    expect(ok(raw({ v: 1, place: "Paris", lat: 1, lon: 2 }))).toEqual({ place: "Paris", lat: 1, lon: 2 });
  });

  it("refuses a title the poster face cannot draw, and one that is too long", () => {
    expect(ok(raw({ v: 1, title: "Night 🌌" }))).toEqual({});
    expect(ok(raw({ v: 1, title: "x".repeat(201) }))).toEqual({});
    expect(ok(raw({ v: 1, title: "Céu Austral" }))).toEqual({ title: "Céu Austral" });
  });

  it("refuses an impossible date and a wrongly shaped one", () => {
    expect(ok(raw({ v: 1, when_local: "2026-02-31T10:00" }))).toEqual({});
    expect(ok(raw({ v: 1, when_local: "2026-01-01T25:00" }))).toEqual({});
    expect(ok(raw({ v: 1, when_local: "2026-01-01 10:00" }))).toEqual({});
  });

  it("holds the magnitude to the form's range", () => {
    expect(ok(raw({ v: 1, magnitude_limit: 0.5 }))).toEqual({});
    expect(ok(raw({ v: 1, magnitude_limit: 7 }))).toEqual({ magnitude_limit: 7 });
    expect(ok(raw({ v: 1, magnitude_limit: "5" }))).toEqual({});
  });

  it("ignores fields it does not know", () => {
    expect(ok(raw({ v: 1, title: "x", mystery: 1 }))).toEqual({ title: "x" });
  });
});

describe("what it cannot read", () => {
  it("is invalid for a version it does not know", () => {
    expect(decodeCreation(raw({ v: 2, title: "x" }))).toEqual({ status: "invalid" });
    expect(decodeCreation(raw({ title: "x" }))).toEqual({ status: "invalid" });
  });

  it("is invalid for garbage, never a throw", () => {
    expect(decodeCreation("not-a-payload")).toEqual({ status: "invalid" });
    expect(decodeCreation("")).toEqual({ status: "invalid" });
    expect(decodeCreation("!!!")).toEqual({ status: "invalid" });
    expect(decodeCreation("x".repeat(5000))).toEqual({ status: "invalid" });
  });

  it("is invalid for valid zlib that is not an object", () => {
    expect(decodeCreation(raw([1, 2]))).toEqual({ status: "invalid" });
    expect(decodeCreation(raw("text"))).toEqual({ status: "invalid" });
  });
});

describe("creationFragmentFromHash", () => {
  it("reads only #c=", () => {
    expect(creationFragmentFromHash("#c=abc")).toBe("abc");
    expect(creationFragmentFromHash("c=abc")).toBe("abc");
    expect(creationFragmentFromHash("#s=abc")).toBeNull();
    expect(creationFragmentFromHash("#e=abc")).toBeNull();
    expect(creationFragmentFromHash("#studio=abc")).toBeNull();
    expect(creationFragmentFromHash("#c=")).toBeNull();
    expect(creationFragmentFromHash("")).toBeNull();
  });
});
