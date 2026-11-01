/**
 * Component tests for the `#e=` page: its states, and that names are optional.
 * The canvas itself is covered by the controller, planner and renderer tests
 * and by the Playwright journeys; happy-dom has no 2D context to draw on.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { at } from "../../lib/testing.ts";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const { default: ExplorerPage, loadScene, resetSceneCache } = await import("./ExplorerPage.tsx");
const { encodeExplorer } = await import("../../lib/sky/payload.ts");

import type { ExplorerPayload } from "../../lib/sky/payload.ts";

const PAYLOAD: ExplorerPayload = {
  v: 1,
  lat: 30,
  lon: 31,
  place: "Giza",
  tz: "Africa/Cairo",
  when_utc: "2026-01-01T00:00:00Z",
  title: null,
  mag: 6,
  q: [0, 0, 0, 1],
  fov: 60,
  layers: { below: "dimmed" },
  sel: null,
};

const CATALOG = { stars: [[32349, 101.28, -16.71, -1.44], [1, 10, 10, 3]] };
const SEGMENTS = { segments: [["CMa", "Canis Major", 32349, 1]] };

type Route = (url: string) => unknown;

function stubFetch(route: Route): void {
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = route(url);
    return Promise.resolve(
      body === null
        ? new Response("missing", { status: 404 })
        : new Response(JSON.stringify(body), { status: 200 }),
    );
  }) as typeof fetch;
}

class StubResizeObserver {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

const realFetch = globalThis.fetch;
const realFonts = Object.getOwnPropertyDescriptor(document, "fonts");

beforeEach(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve(), check: () => true, load: () => Promise.resolve([]) },
  });
  resetSceneCache();
  (globalThis as unknown as Record<string, unknown>)["ResizeObserver"] = StubResizeObserver;
});

afterEach(() => {
  cleanup();
  if (realFonts) Object.defineProperty(document, "fonts", realFonts);
  else Reflect.deleteProperty(document, "fonts");
  globalThis.fetch = realFetch;
  window.location.hash = "";
});

describe("loadScene", () => {
  it("treats a missing names file as no names, not an error", async () => {
    stubFetch((url) => (url.endsWith("catalog.json") ? CATALOG : url.endsWith("constellations.json") ? SEGMENTS : null));
    const scene = await loadScene();
    expect(scene.stars).toHaveLength(2);
    expect(at(scene.stars, 0).name).toBeNull();
  });

  it("names stars when the file is there", async () => {
    stubFetch((url) =>
      url.endsWith("catalog.json") ? CATALOG : url.endsWith("constellations.json") ? SEGMENTS : { names: [[32349, "Sirius"]] },
    );
    expect(at((await loadScene()).stars, 0).name).toBe("Sirius");
  });

  it("fails when the catalog is missing, and tries again next time", async () => {
    stubFetch(() => null);
    expect(loadScene()).rejects.toThrow();
    await Promise.resolve();
    stubFetch((url) => (url.endsWith("catalog.json") ? CATALOG : url.endsWith("constellations.json") ? SEGMENTS : null));
    expect((await loadScene()).stars).toHaveLength(2);
  });
});

describe("ExplorerPage", () => {
  it("explains a link it cannot read and offers the way back", () => {
    window.location.hash = "#e=not-a-payload";
    render(<ExplorerPage />);
    expect(screen.getByRole("heading", { name: "This link holds no sky" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("could not be read");
    const back = screen.getByRole("link", { name: "Back to the start" });
    expect(back.getAttribute("href")).toBe("#/");
  });

  it("says so when the star data cannot be loaded", async () => {
    window.location.hash = `#e=${encodeExplorer(PAYLOAD)}`;
    stubFetch(() => null);
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Star data could not be loaded" })).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: "Back to the start" })).toBeTruthy();
  });

  it("shows the labelled, focusable canvas and a ready announcement", async () => {
    window.location.hash = `#e=${encodeExplorer(PAYLOAD)}`;
    stubFetch((url) => (url.endsWith("catalog.json") ? CATALOG : url.endsWith("constellations.json") ? SEGMENTS : null));
    render(<ExplorerPage />);
    const canvas = await screen.findByRole("img", { name: "Sky map above Giza" });
    expect(canvas.getAttribute("tabindex")).toBe("0");
    expect(canvas.getAttribute("aria-describedby")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Map announcements" }).textContent).toBe("Sky Explorer ready.");
    });
  });
});

describe("ExplorerPage interface", () => {
  const route = (url: string): unknown =>
    url.endsWith("catalog.json")
      ? CATALOG
      : url.endsWith("constellations.json")
        ? SEGMENTS
        : url.endsWith("names.json")
          ? { names: [[32349, "Sirius"]] }
          : null;

  async function open() {
    window.location.hash = `#e=${encodeExplorer({ ...PAYLOAD, title: "Night one" })}`;
    stubFetch(route);
    render(<ExplorerPage />);
    await screen.findByRole("toolbar", { name: "Map controls" });
  }

  it("shows the moment strip, the toolbar, and an inspector closed until its tab opens it", async () => {
    await open();
    expect(screen.getByRole("region", { name: "Moment" }).textContent).toContain("Night one");
    expect(screen.queryByRole("button", { name: "Inspector" })).toBeNull();
    const toggle = document.querySelector<HTMLButtonElement>(".explorer-tab");
    if (!toggle) throw new Error("no tab");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Show details");
    // 012-poster-studio: the toolbar now offers the way into the Studio.
    expect(screen.getByRole("button", { name: "Create poster" })).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Hide details");
    expect(toggle.getAttribute("aria-controls")).toBe("explorer-inspector-body");
    expect(screen.getByRole("list", { name: /Above the horizon/ })).toBeTruthy();
  });

  it("returns focus to the tab when the panel is closed from its own button", async () => {
    await open();
    const toggle = document.querySelector<HTMLButtonElement>(".explorer-tab");
    if (!toggle) throw new Error("no tab");
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Close inspector" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("opens layers with focus inside, and Escape closes them and returns focus", async () => {
    await open();
    const layers = screen.getByRole("button", { name: "Layers" });
    fireEvent.click(layers);
    expect(document.activeElement?.getAttribute("type")).toBe("checkbox");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Layers" })).toBeNull();
    expect(document.activeElement).toBe(layers);
  });

  it("searches, selects and centers; the inspector follows; Escape clears", async () => {
    await open();
    const search = screen.getByRole("button", { name: "Search" });
    fireEvent.click(search);
    const input = screen.getByRole("combobox", { name: "Search constellations and stars" });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "siri" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryByRole("combobox")).toBeNull();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sirius" })).toBeTruthy();
    });
    expect(screen.getByRole("status", { name: "Map announcements" }).textContent).toMatch(/^Sirius selected/);
    expect(document.activeElement).toBe(screen.getByRole("img", { name: /Sky map/ }));
    fireEvent.keyDown(screen.getByRole("img", { name: /Sky map/ }), { key: "Escape" });
    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Map announcements" }).textContent).toBe("Selection cleared.");
    });
  });

  it("closes search before it clears the selection", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "siri" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("status", { name: "Map announcements" }).textContent).toMatch(/^Sirius selected/);
  });
});
