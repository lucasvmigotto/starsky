import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { geocodePlace, searchPlaces, shortPlaceName } from "./geocode.ts";

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
    mock.restore();
  });

  it("resolves the first result with labels", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue({
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
    } as unknown as Response);
    const resolved = await geocodePlace("Times Square, New York, NY");
    expect(resolved.lat).toBeCloseTo(40.758, 6);
    expect(resolved.lon).toBeCloseTo(-73.9855, 6);
    expect(resolved.short).toBe("Times Square, New York, United States");
    const firstArg: unknown = fetchMock.mock.calls[0]?.[0];
    const url = typeof firstArg === "string" ? firstArg : String(firstArg);
    expect(url).toContain("format=jsonv2");
    expect(url).toContain("limit=1");
    expect(url).toContain("addressdetails=1");
  });

  it("rejects empty queries and empty results", async () => {
    await rejectionOf(geocodePlace("   "));
    spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as unknown as Response);
    const message = await rejectionOf(geocodePlace("nowhere-at-all"));
    expect(message).toMatch(/No place found/);
  });
});

/**
 * bun:test's `expect(...).rejects` returns `void`, so it cannot be awaited and
 * the matcher is fire-and-forget. This helper awaits the promise itself and
 * returns the rejection message, keeping the assertion lint-clean and the
 * failure mode explicit.
 */
async function rejectionOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the promise to reject, but it resolved");
}

describe("searchPlaces", () => {
  afterEach(() => {
    mock.restore();
  });

  const items = [
    { lat: "48.8584", lon: "2.2945", display_name: "Eiffel Tower, Paris", name: "Eiffel Tower", address: { city: "Paris", country: "France" } },
    { lat: "bad", lon: "2", display_name: "Broken" },
    { lat: "35.6", lon: "139.7", display_name: "Tokyo, Japan" },
  ];

  it("returns every usable result, asking for several, with the caller's signal", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(items),
    } as Response);
    const signal = new AbortController().signal;
    const found = await searchPlaces("eiffel", { signal });
    expect(found.map((p) => p.short)).toEqual(["Eiffel Tower, Paris, France", "Tokyo, Japan"]);
    expect(found[0]).toMatchObject({ lat: 48.8584, lon: 2.2945 });
    const firstArg: unknown = fetchMock.mock.calls[0]?.[0];
    const url = typeof firstArg === "string" ? firstArg : "";
    expect(url).toContain("q=eiffel");
    expect(url).toContain("limit=5");
    expect(url).toContain("addressdetails=1");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it("returns an empty list when nothing matches", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response);
    expect(await searchPlaces("zzzz")).toEqual([]);
  });

  it("rejects on an HTTP failure and on a network failure", async () => {
    spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 503 } as Response);
    expect(await rejectionOf(searchPlaces("paris"))).toMatch(/HTTP 503/);
    spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("offline"));
    expect(await rejectionOf(searchPlaces("paris"))).toMatch(/failed/);
  });

  it("lets an abort through as an abort", async () => {
    spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    expect(await rejectionOf(searchPlaces("paris"))).toBe("aborted");
  });
});
