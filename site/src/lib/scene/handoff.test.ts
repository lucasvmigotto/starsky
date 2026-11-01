import { beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { createPosterHash, exploreHash, returnToExplorerHash, seedStudioHash } = await import("./handoff.ts");
const { decodeDraft, studioFragmentFromHash } = await import("../studio/draft.ts");
const { decodeExplorer, explorerFragmentFromHash } = await import("../sky/payload.ts");
const { loadReturnCamera } = await import("./returnCamera.ts");

import type { SharePayload } from "../share.ts";
import type { ExplorerCamera } from "../sky/camera.ts";
import type { ExplorerPayload } from "../sky/payload.ts";

const EXPLORER: ExplorerPayload = {
  v: 1,
  lat: 30,
  lon: 31,
  place: "Giza",
  tz: "Africa/Cairo",
  when_utc: "2026-01-01T00:00:00Z",
  title: "A night",
  mag: 9,
  q: [0, 0, 0, 1],
  fov: 60,
  layers: { below: "dimmed" },
  sel: "HIP:32349",
};

const POSTER: SharePayload = {
  v: 1,
  lat: 30,
  lon: 31,
  place: "Giza",
  when_utc: "2026-01-01T00:00:00Z",
  tz: "Africa/Cairo",
  options: {
    projection: "fisheye",
    fisheye_strength: 2,
    min_separation: 0.01,
    magnitude_limit: 4,
    glow: false,
    glow_intensity: 1,
    constellations: true,
    constellation_labels: false,
    shape: "square",
    title: "Shared",
  },
};

const realStorage = window.sessionStorage;

beforeEach(() => {
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: realStorage });
  window.sessionStorage.clear();
});

describe("Explorer -> Studio", () => {
  it("opens a #studio= draft with the scene, title and a clamped magnitude", () => {
    const hash = createPosterHash(EXPLORER, { orientation: [0, 0, 0, 1], fovDeg: 44 }, "en-US");
    const draft = decodeDraft(studioFragmentFromHash(hash) ?? "");
    expect(draft.place).toBe("Giza");
    expect(draft.options.title).toBe("A night");
    expect(draft.options.magnitude_limit).toBe(7);
    expect(draft.options.shape).toBe("circle");
  });

  it("remembers the camera it left, for this scene only", () => {
    createPosterHash(EXPLORER, { orientation: [0, 0, 0, 1], fovDeg: 44 }, "en-US");
    expect(loadReturnCamera(EXPLORER)?.fovDeg).toBe(44);
    expect(loadReturnCamera({ ...EXPLORER, lat: 31 })).toBeNull();
  });

  it("still opens the Studio when storage is unavailable", () => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(createPosterHash(EXPLORER, { orientation: [0, 0, 0, 1], fovDeg: 44 }, "en-US")).toStartWith("#studio=");
  });
});

describe("Studio -> Explorer", () => {
  it("restores the saved camera when the scene matches", () => {
    createPosterHash(EXPLORER, { orientation: [0, 0, 0, 1], fovDeg: 44 }, "en-US");
    const poster = { ...POSTER, options: { ...POSTER.options, magnitude_limit: 5 } };
    const explorer = decodeExplorer(explorerFragmentFromHash(returnToExplorerHash(poster)) ?? "");
    expect(explorer.fov).toBe(44);
    expect(explorer.mag).toBe(5);
    expect(explorer.title).toBe("Shared");
  });

  it("falls back to the initial view when nothing matches", () => {
    const explorer = decodeExplorer(explorerFragmentFromHash(returnToExplorerHash(POSTER)) ?? "");
    expect(explorer.fov).toBe(100);
    expect(explorer.sel).toBeNull();
  });
});

describe("Viewer actions", () => {
  it("explore: the poster's place and moment, at the initial view", () => {
    const explorer = decodeExplorer(explorerFragmentFromHash(exploreHash(POSTER)) ?? "");
    expect(explorer.place).toBe("Giza");
    expect(explorer.when_utc).toBe(POSTER.when_utc);
    expect(explorer.fov).toBe(100);
  });

  it("make your own: a #studio= draft that is the shared poster itself", () => {
    expect(decodeDraft(studioFragmentFromHash(seedStudioHash(POSTER)) ?? "")).toEqual(POSTER);
  });
});

describe("poster language across the hand-offs (018 US2, US4)", () => {
  const camera: ExplorerCamera = { orientation: [0, 0, 0, 1], fovDeg: 44 };
  const draftOf = (hash: string): SharePayload => decodeDraft(studioFragmentFromHash(hash) ?? "");
  const explorerOf = (hash: string): ExplorerPayload => decodeExplorer(explorerFragmentFromHash(hash) ?? "");

  it("Explorer -> Studio: an en-US visitor with no #e= language gets a draft with no lang", () => {
    const draft = draftOf(createPosterHash(EXPLORER, camera, "en-US"));
    expect("lang" in draft).toBe(false);
  });

  it("Explorer -> Studio: a pt-BR visitor's draft starts in pt-BR", () => {
    expect(draftOf(createPosterHash(EXPLORER, camera, "pt-BR")).lang).toBe("pt-BR");
  });

  it("Explorer -> Studio: the #e= language wins over the interface", () => {
    const draft = draftOf(createPosterHash({ ...EXPLORER, lang: "pt-BR" }, camera, "en-US"));
    expect(draft.lang).toBe("pt-BR");
  });

  it("Studio and Viewer -> Explorer carry the poster's language, and only pt-BR is written", () => {
    expect(explorerOf(returnToExplorerHash({ ...POSTER, lang: "pt-BR" })).lang).toBe("pt-BR");
    expect(explorerOf(exploreHash({ ...POSTER, lang: "pt-BR" })).lang).toBe("pt-BR");
    expect("lang" in explorerOf(exploreHash(POSTER))).toBe(false);
  });

  it("Viewer -> Studio: the draft is the shared poster, language included", () => {
    expect(draftOf(seedStudioHash({ ...POSTER, lang: "pt-BR" })).lang).toBe("pt-BR");
  });
});
