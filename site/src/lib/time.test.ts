import { describe, expect, it } from "vitest";
import { toWhenUtcIso, zonedTimeToUtc } from "./time.ts";

describe("zonedTimeToUtc", () => {
  it("is identity for UTC", () => {
    expect(zonedTimeToUtc(2026, 1, 1, 0, 0, "UTC").toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("applies winter offset for America/New_York", () => {
    expect(zonedTimeToUtc(2026, 1, 1, 0, 0, "America/New_York").toISOString()).toBe(
      "2026-01-01T05:00:00.000Z",
    );
  });

  it("applies summer offset for America/New_York", () => {
    expect(zonedTimeToUtc(2026, 7, 1, 12, 0, "America/New_York").toISOString()).toBe(
      "2026-07-01T16:00:00.000Z",
    );
  });

  it("handles Asia/Tokyo ahead of UTC", () => {
    expect(zonedTimeToUtc(1998, 11, 17, 11, 17, "Asia/Tokyo").toISOString()).toBe(
      "1998-11-17T02:17:00.000Z",
    );
  });

  it("throws for unknown zones", () => {
    expect(() => zonedTimeToUtc(2026, 1, 1, 0, 0, "Not/AZone")).toThrow(RangeError);
  });
});

describe("toWhenUtcIso", () => {
  it("strips zero millis for Python byte-compat", () => {
    expect(toWhenUtcIso(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-01-01T00:00:00Z",
    );
  });

  it("keeps nonzero millis", () => {
    expect(toWhenUtcIso(new Date("2026-01-01T00:00:00.250Z"))).toBe(
      "2026-01-01T00:00:00.250Z",
    );
  });
});
