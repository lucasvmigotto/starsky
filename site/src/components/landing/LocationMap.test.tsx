import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const { default: LocationMapPanel } = await import("./LocationMapPanel.tsx");

import type { MapFocus, MapModule, MapOptions } from "./mapTypes.ts";

afterEach(() => {
  cleanup();
});

interface Fake {
  module: MapModule;
  created: MapOptions[];
  moves: { lat: number; lon: number; focus: MapFocus }[];
  resizes: number[];
  destroyed: number[];
}

function fakeMap(): Fake {
  const fake: Fake = { created: [], moves: [], resizes: [], destroyed: [], module: { createMap: () => { throw new Error("unset"); } } };
  fake.module = {
    createMap: (container, options) => {
      fake.created.push(options);
      container.setAttribute("data-fake-map", "true");
      return {
        setLocation: (lat, lon, focus) => fake.moves.push({ lat, lon, focus }),
        resize: () => fake.resizes.push(1),
        destroy: () => fake.destroyed.push(1),
      };
    },
  };
  return fake;
}

interface Calls {
  toggled: number;
  expanded: number;
  escaped: number;
  picks: [number, number][];
  problems: (string | null)[];
}

function mount(
  props: Partial<{ open: boolean; expanded: boolean; problem: "chunk" | "tiles" | null; load: () => Promise<MapModule> }>,
  fake: Fake,
): Calls {
  const calls: Calls = { toggled: 0, expanded: 0, escaped: 0, picks: [], problems: [] };
  render(
    <LocationMapPanel
      open={props.open ?? true}
      expanded={props.expanded ?? false}
      problem={props.problem ?? null}
      lat={10}
      lon={20}
      focus="keep"
      skipToId="after-map"
      load={props.load ?? (() => Promise.resolve(fake.module))}
      onToggle={() => calls.toggled++}
      onExpandToggle={() => calls.expanded++}
      onEscape={() => calls.escaped++}
      onPick={(lat, lon) => calls.picks.push([lat, lon])}
      onProblem={(p) => calls.problems.push(p)}
    />,
  );
  return calls;
}

describe("LocationMapPanel", () => {
  it("is closed by default: a Show map button, no map and no loader call", () => {
    let loads = 0;
    const fake = fakeMap();
    mount({ open: false, load: () => { loads++; return Promise.resolve(fake.module); } }, fake);
    expect(screen.getByRole("button", { name: "Show map" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: "Map for choosing a place" })).toBeNull();
    expect(loads).toBe(0);
  });

  it("opens through the toggle", () => {
    const calls = mount({ open: false }, fakeMap());
    fireEvent.click(screen.getByRole("button", { name: "Show map" }));
    expect(calls.toggled).toBe(1);
  });

  it("loads the map when open, with the place, and labels the region", async () => {
    const fake = fakeMap();
    mount({}, fake);
    expect(screen.getByRole("region", { name: "Map for choosing a place" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("Loading the map…");
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    const options = fake.created[0];
    expect(options.lat).toBe(10);
    expect(options.lon).toBe(20);
    expect(options.labels.zoomIn).toBe("Zoom in");
    expect(options.labels.marker).toBe("Observing place");
    await waitFor(() => {
      expect(screen.queryByText("Loading the map…")).toBeNull();
    });
  });

  it("gives the attribution the copyright and fixthemap links", async () => {
    const fake = fakeMap();
    mount({}, fake);
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    const html = fake.created[0].labels.attributionHtml;
    expect(html).toContain("© <a");
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain(">OpenStreetMap</a> contributors");
    expect(html).toContain('href="https://www.openstreetmap.org/fixthemap"');
    expect(html).toContain(">Report a problem</a>");
    expect(html).not.toMatch(/noreferrer|referrerpolicy/i);
  });

  it("reports a pick and a tile failure upward", async () => {
    const fake = fakeMap();
    const calls = mount({}, fake);
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    fake.created[0].onPick(1.5, 2.5);
    expect(calls.picks).toEqual([[1.5, 2.5]]);
    fake.created[0].onTilesFailed(true);
    fake.created[0].onTilesFailed(false);
    expect(calls.problems).toEqual(["tiles", null]);
  });

  it("says the map could not load when the chunk fails, and offers no map", async () => {
    const calls = mount({ load: () => Promise.reject(new Error("chunk")) }, fakeMap());
    await waitFor(() => {
      expect(calls.problems).toEqual(["chunk"]);
    });
  });

  it("shows the chunk and tile messages in place, politely", () => {
    const fake = fakeMap();
    mount({ problem: "chunk" }, fake);
    expect(screen.getByText("The map could not be loaded. Search and coordinates still work.").closest("[role=status]")).not.toBeNull();
    cleanup();
    mount({ problem: "tiles" }, fake);
    expect(screen.getByText("The map tiles could not be loaded. Search and coordinates still work.")).toBeDefined();
  });

  it("expands and shrinks with the icon button, named for what it will do", () => {
    const calls = mount({ expanded: false }, fakeMap());
    fireEvent.click(screen.getByRole("button", { name: "Expand map" }));
    expect(calls.expanded).toBe(1);
    cleanup();
    mount({ expanded: true }, fakeMap());
    expect(screen.getByRole("button", { name: "Shrink map" })).toBeDefined();
  });

  it("Escape shrinks an expanded map from anywhere on the page, and only then", () => {
    const calls = mount({ expanded: true }, fakeMap());
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(calls.escaped).toBe(1);
    cleanup();
    const idle = mount({ expanded: false }, fakeMap());
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(idle.escaped).toBe(0);
  });

  it("asks the map to resize when it expands", async () => {
    const fake = fakeMap();
    const { rerender } = render(
      <LocationMapPanel open expanded={false} problem={null} lat={10} lon={20} focus="keep" skipToId="x" load={() => Promise.resolve(fake.module)} onToggle={() => undefined} onExpandToggle={() => undefined} onEscape={() => undefined} onPick={() => undefined} onProblem={() => undefined} />,
    );
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    rerender(
      <LocationMapPanel open expanded problem={null} lat={10} lon={20} focus="keep" skipToId="x" load={() => Promise.resolve(fake.module)} onToggle={() => undefined} onExpandToggle={() => undefined} onEscape={() => undefined} onPick={() => undefined} onProblem={() => undefined} />,
    );
    await waitFor(() => {
      expect(fake.resizes.length).toBeGreaterThan(0);
    });
  });

  it("moves the marker when the place changes elsewhere, and focuses a searched place", async () => {
    const fake = fakeMap();
    const props = { open: true, expanded: false, problem: null, skipToId: "x", load: () => Promise.resolve(fake.module), onToggle: () => undefined, onExpandToggle: () => undefined, onEscape: () => undefined, onPick: () => undefined, onProblem: () => undefined } as const;
    const { rerender } = render(<LocationMapPanel {...props} lat={10} lon={20} focus="keep" />);
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    rerender(<LocationMapPanel {...props} lat={48.85} lon={2.35} focus="place" />);
    await waitFor(() => {
      expect(fake.moves[fake.moves.length - 1]).toEqual({ lat: 48.85, lon: 2.35, focus: "place" });
    });
  });

  it("destroys the map when closed or unmounted", async () => {
    const fake = fakeMap();
    const { unmount } = render(
      <LocationMapPanel open expanded={false} problem={null} lat={1} lon={2} focus="keep" skipToId="x" load={() => Promise.resolve(fake.module)} onToggle={() => undefined} onExpandToggle={() => undefined} onEscape={() => undefined} onPick={() => undefined} onProblem={() => undefined} />,
    );
    await waitFor(() => {
      expect(fake.created).toHaveLength(1);
    });
    unmount();
    expect(fake.destroyed).toHaveLength(1);
  });

  it("offers a skip control that moves focus past the map", () => {
    const target = document.createElement("button");
    target.id = "after-map";
    document.body.appendChild(target);
    mount({}, fakeMap());
    fireEvent.click(screen.getByRole("button", { name: "Skip the map" }));
    expect(document.activeElement).toBe(target);
    target.remove();
  });
});
