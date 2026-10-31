/**
 * Component tests for the `#e=` page: its states, and that names are optional.
 * The canvas itself is covered by the controller, planner and renderer tests
 * and by the Playwright journeys; happy-dom has no 2D context to draw on.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, render, screen, waitFor } = await import("@testing-library/react");
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

beforeEach(() => {
  resetSceneCache();
  (globalThis as unknown as Record<string, unknown>)["ResizeObserver"] = StubResizeObserver;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  window.location.hash = "";
});

describe("loadScene", () => {
  it("treats a missing names file as no names, not an error", async () => {
    stubFetch((url) => (url.endsWith("catalog.json") ? CATALOG : url.endsWith("constellations.json") ? SEGMENTS : null));
    const scene = await loadScene();
    expect(scene.stars).toHaveLength(2);
    expect(scene.stars[0].name).toBeNull();
  });

  it("names stars when the file is there", async () => {
    stubFetch((url) =>
      url.endsWith("catalog.json") ? CATALOG : url.endsWith("constellations.json") ? SEGMENTS : { names: [[32349, "Sirius"]] },
    );
    expect((await loadScene()).stars[0].name).toBe("Sirius");
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
      expect(screen.getByRole("status").textContent).toBe("Sky Explorer ready.");
    });
  });
});
