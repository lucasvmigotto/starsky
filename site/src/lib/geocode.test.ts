import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodePlace, shortPlaceName } from "./geocode.ts";

describe("shortPlaceName", () => {
  it("prefers name + city + state", () => {
    expect(
      shortPlaceName({
        name: "Times Square",
        address: {
          city: "New York",
          state: "New York",
          country: "United States",
        },
      }),
    ).toBe("Times Square, New York, United States");
  });

  it("falls back to road and town keys", () => {
    expect(
      shortPlaceName({
        address: { road: "Champs-Élysées", town: "Paris", country: "France" },
      }),
    ).toBe("Champs-Élysées, Paris, France");
  });

  it("dedupes repeated parts and caps at three", () => {
    expect(
      shortPlaceName({
        name: "Paris",
        address: { city: "Paris", country: "France" },
      }),
    ).toBe("Paris, France");
  });

  it("truncates display_name when no address parts exist", () => {
    const display_name = `${"x".repeat(100)} end`;
    expect(shortPlaceName({ display_name })).toBe(display_name.slice(0, 80));
  });
});

describe("geocodePlace", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the first result with labels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              lat: "40.7580",
              lon: "-73.9855",
              display_name: "Times Square, Manhattan, ...",
              name: "Times Square",
              address: {
                city: "New York",
                state: "New York",
                country: "United States",
              },
            },
          ]),
      }),
    );
    const resolved = await geocodePlace("Times Square, New York, NY");
    expect(resolved.lat).toBeCloseTo(40.758, 6);
    expect(resolved.lon).toBeCloseTo(-73.9855, 6);
    expect(resolved.short).toBe("Times Square, New York, United States");
    const url = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? "");
    expect(url).toContain("format=jsonv2");
    expect(url).toContain("limit=1");
    expect(url).toContain("addressdetails=1");
  });

  it("rejects empty queries and empty results", async () => {
    await expect(geocodePlace("   ")).rejects.toThrow();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }),
    );
    await expect(geocodePlace("nowhere-at-all")).rejects.toThrow(/No place found/);
  });
});
