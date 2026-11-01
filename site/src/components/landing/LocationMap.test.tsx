import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { at } from "../../lib/testing.ts";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, render, screen, waitFor } = await import("@testing-library/react");
const { default: LocationMapPanel } = await import("./LocationMapPanel.tsx");

import type { MapFocus, MapModule, MapOptions } from "./mapTypes.ts";

afterEach(() => {
  cleanup();
});

interface Fake {
  module: MapModule;
  created: MapOptions[];
  moves: { lat: number; lon: number; focus: MapFocus }[];
  destroyed: number[];
  resizes: number[];
}

function fakeMap(): Fake {
  const fake: Fake = { created: [], moves: [], destroyed: [], resizes: [], module: { createMap: () => { throw new Error("unset"); } } };
  fake.module = {
    createMap: (container, options) => {
      fake.created.push(options);
      container.setAttribute("data-fake-map", "true");
      return {
        setLocation: (lat, lon, focus) => fake.moves.push({ lat, lon, focus }),
        resize: () => fake.resizes.push(1),
        setLabels: () => undefined,
        destroy: () => fake.destroyed.push(1),
      };
    },
  };
  return fake;
}

interface Calls {
  picks: [number, number][];
  problems: (string | null)[];
}

type Problem = "chunk" | "tiles" | null;

function panel(fake: Fake, calls: Calls, extra: { problem?: Problem; lat?: number; lon?: number; focus?: MapFocus; load?: () => Promise<MapModule> }) {
  return (
    <LocationMapPanel
      problem={extra.problem ?? null}
      lat={extra.lat ?? 10}
      lon={extra.lon ?? 20}
      focus={extra.focus ?? "keep"}
      load={extra.load ?? (() => Promise.resolve(fake.module))}
      onPick={(lat, lon) => calls.picks.push([lat, lon])}
      onProblem={(p) => calls.problems.push(p)}
    />
  );
}

function mount(fake: Fake, extra: Parameters<typeof panel>[2] = {}): Calls {
  const calls: Calls = { picks: [], problems: [] };
  render(panel(fake, calls, extra));
  return calls;
}

describe("LocationMapPanel", () => {
  it("is always on the page: a labelled region with the map loading at once, and no toggle or expand button", async () => {
    const fake = fakeMap();
    mount(fake);
    expect(screen.getByRole("region", { name: "Map for choosing a place" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("Loading the map…");
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    await waitFor(() => {
      expect(screen.queryByText("Loading the map…")).toBeNull();
    });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("creates the map at the place with the zoom labels and marker label", async () => {
    const fake = fakeMap();
    mount(fake);
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    const options = at(fake.created, 0);
    expect([options.lat, options.lon]).toEqual([10, 20]);
    expect(options.labels.zoomIn).toBe("Zoom in");
    expect(options.labels.marker).toBe("Observing place");
  });

  it("gives the attribution the copyright and fixthemap links", async () => {
    const fake = fakeMap();
    mount(fake);
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    const html = at(fake.created, 0).labels.attributionHtml;
    expect(html).toContain("© <a");
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain(">OpenStreetMap</a> contributors");
    expect(html).toContain('href="https://www.openstreetmap.org/fixthemap"');
    expect(html).toContain(">Report a problem</a>");
    expect(html).not.toMatch(/noreferrer|referrerpolicy/i);
  });

  it("shows the map hint, the search credit and the privacy link as one line under the map", () => {
    mount(fakeMap());
    const line = screen.getByText(/Click or drag the pin to set the place/);
    expect(line.textContent).toBe(
      "Click or drag the pin to set the place · Search by Nominatim · Privacy",
    );
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("#privacy");
  });

  it("reports a pick and a tile failure upward", async () => {
    const fake = fakeMap();
    const calls = mount(fake);
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    at(fake.created, 0).onPick(1.5, 2.5);
    at(fake.created, 0).onTilesFailed(true);
    at(fake.created, 0).onTilesFailed(false);
    expect(calls.picks).toEqual([[1.5, 2.5]]);
    expect(calls.problems).toEqual(["tiles", null]);
  });

  it("reports a chunk that cannot load", async () => {
    const calls = mount(fakeMap(), { load: () => Promise.reject(new Error("chunk")) });
    await waitFor(() => {
      expect(calls.problems).toEqual(["chunk"]);
    });
  });

  it("says in the map's own box that it could not load, and points to Coordinates", () => {
    mount(fakeMap(), { problem: "chunk" });
    const notice = screen.getByText("The map could not be loaded. Search still works, or turn on Coordinates to type a place.");
    expect(notice.closest(".landing-map-box")).not.toBeNull();
    expect(notice.closest("[role=status]")).not.toBeNull();
  });

  it("reports tile failure in place, politely, and keeps the map", () => {
    mount(fakeMap(), { problem: "tiles" });
    expect(screen.getByText("The map tiles could not be loaded. Search still works, or turn on Coordinates to type a place.").closest("[role=status]")).not.toBeNull();
    expect(document.querySelector(".landing-map-canvas")?.hasAttribute("hidden")).toBe(false);
  });

  it("moves the marker when the place changes elsewhere, and focuses a searched place", async () => {
    const fake = fakeMap();
    const calls: Calls = { picks: [], problems: [] };
    const { rerender } = render(panel(fake, calls, {}));
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    rerender(panel(fake, calls, { lat: 48.85, lon: 2.35, focus: "place" }));
    await waitFor(() => {
      expect(fake.moves[fake.moves.length - 1]).toEqual({ lat: 48.85, lon: 2.35, focus: "place" });
    });
  });

  it("tells the map when its container changes size, once per burst", async () => {
    const callbacks: (() => void)[] = [];
    const disconnected: number[] = [];
    const real = (window as unknown as Record<string, unknown>)["ResizeObserver"];
    (window as unknown as Record<string, unknown>)["ResizeObserver"] = class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe(): void {}
      disconnect(): void {
        disconnected.push(1);
      }
    };
    try {
      const fake = fakeMap();
      const calls: Calls = { picks: [], problems: [] };
      const { unmount } = render(panel(fake, calls, {}));
      await waitFor(() => {
        expect(callbacks).toHaveLength(1);
      });
      callbacks[0]?.();
      callbacks[0]?.();
      callbacks[0]?.();
      expect(fake.resizes).toHaveLength(0);
      await waitFor(() => {
        expect(fake.resizes).toHaveLength(1);
      });
      unmount();
      expect(disconnected).toHaveLength(1);
    } finally {
      (window as unknown as Record<string, unknown>)["ResizeObserver"] = real;
    }
  });

  it("destroys the map when it leaves the page", async () => {
    const fake = fakeMap();
    const calls: Calls = { picks: [], problems: [] };
    const { unmount } = render(panel(fake, calls, {}));
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    unmount();
    expect(fake.destroyed).toHaveLength(1);
  });
});
