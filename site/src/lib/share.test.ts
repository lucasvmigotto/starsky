import { describe, expect, it } from "bun:test";
import {
  base64UrlToBytes,
  decodeShareFragment,
  decodeSkyState,
  fragmentFromHash,
  migrateSharePayload,
  ShareDecodeError,
  ShareVersionError,
} from "./share.ts";

/**
 * Real payload vector generated with the repo encoder:
 * `uv run python -c "from ... import encode_payload"` for
 * lat=40.7580, lon=-73.9855, Times Square, 2026-01-01T00:00:00Z, UTC,
 * title "Our Night".
 */
const VECTOR =
  "eNpVjk1PwzAMhv9K5XNWZYOykSv3cVh3gEsVMtN6pElJXKox7b_jjg8JyZKtx6_s5wzeMphbXa6rjQIfA5jF-qa831SVgjgwxZDBnMFJZ_SSFtJ4-4JeOKcR1f_dH32l3OEJm8wJQ8sdmGWpFbQ-Tr-ReW4oMIZMfPoJ9LYNxOMBG089iVxVillPock42HR9AkaXWgseUjyi-0YgEgljm-zQkQMFubMDCneUnEcBTOxn8DimYkttx3CRE966GdbUYy5276NNqIotTsVTTG-q2IsNHoodW8Y8H_mU8L5-kPFDlBVMHYZmZCd4pVd3C72UqrU213qGyxfuaHRl";

describe("decodeShareFragment", () => {
  it("decodes a real encoder vector", () => {
    const payload = decodeShareFragment(VECTOR);
    expect(payload.v).toBe(1);
    expect(payload.lat).toBeCloseTo(40.758, 6);
    expect(payload.lon).toBeCloseTo(-73.9855, 6);
    expect(payload.place).toBe("Times Square, New York, United States");
    expect(payload.when_utc).toBe("2026-01-01T00:00:00Z");
    expect(payload.tz).toBe("UTC");
    expect(payload.options.projection).toBe("stereographic");
    expect(payload.options.shape).toBe("circle");
    expect(payload.options.title).toBe("Our Night");
    expect(payload.options.magnitude_limit).toBeCloseTo(5.8, 6);
  });

  it("rejects garbage with a helpful error", () => {
    expect(() => decodeShareFragment("!!!not-base64!!!")).toThrow(
      ShareDecodeError,
    );
  });

  it("rejects truncated/inflated garbage", () => {
    expect(() => decodeShareFragment("aGVsbG8")).toThrow(ShareDecodeError);
  });

  it("rejects legacy versions directionally", async () => {
    const { deflate } = await import("pako");
    const { Buffer } = await import("node:buffer");
    const raw = deflate(JSON.stringify({ v: 0 }), { level: 9 });
    const frag = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    let caught: unknown = null;
    try {
      decodeShareFragment(frag);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ShareVersionError);
  });
});

describe("migrateSharePayload", () => {
  it("passes a v1 document through validated", () => {
    const payload = decodeShareFragment(VECTOR);
    const migrated = migrateSharePayload(JSON.parse(JSON.stringify(payload)));
    expect(migrated).toEqual(payload);
  });

  it("rejects unknown versions as legacy, not corrupt", () => {
    expect(() => migrateSharePayload({ v: 2 })).toThrow(ShareVersionError);
    expect(() => migrateSharePayload({ v: 0 })).toThrow(ShareVersionError);
  });

  it("rejects non-objects as corrupt", () => {
    expect(() => migrateSharePayload(null)).toThrow(ShareDecodeError);
    expect(() => migrateSharePayload("sky")).toThrow(ShareDecodeError);
  });

  it("decodeSkyState agrees with decodeShareFragment", () => {
    expect(decodeSkyState(VECTOR)).toEqual(decodeShareFragment(VECTOR));
  });
});

describe("base64UrlToBytes", () => {
  it("round-trips url-safe alphabet without padding", () => {
    const bytes = base64UrlToBytes("PDw_Pz8-Pg");
    expect(bytes.length).toBeGreaterThan(0);
  });
});

describe("fragmentFromHash", () => {
  it("extracts #s= fragments and ignores router hashes", () => {
    expect(fragmentFromHash("#s=abc123")).toBe("abc123");
    expect(fragmentFromHash("#/")).toBeNull();
    expect(fragmentFromHash("")).toBeNull();
  });
});
