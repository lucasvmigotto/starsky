import { describe, expect, it } from "bun:test";
import { decodeExplorer, explorerFragmentFromHash } from "../sky/payload.ts";
import type { ExplorerPayload } from "../sky/payload.ts";
import type { ExplorerController } from "./controller.ts";
import { DEFAULT_LAYERS } from "./layers.ts";
import { absoluteLink, bindLink, layersToPayload, linkHash, payloadFromState } from "./link.ts";

const BASE: ExplorerPayload = {
  v: 1,
  lat: 30,
  lon: 31,
  place: "Giza",
  tz: "Africa/Cairo",
  when_utc: "2026-01-01T00:00:00Z",
  title: "A night",
  mag: 5.5,
  q: [0, 0, 0, 1],
  fov: 100,
  layers: { below: "dimmed" },
  sel: null,
};

const STATE = {
  camera: { orientation: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number], fovDeg: 42 },
  layers: { ...DEFAULT_LAYERS, horizon: false, below: "hidden" as const },
  selection: "HIP:32349",
};

describe("payloadFromState", () => {
  it("keeps the moment and takes camera, layers and selection from the view", () => {
    const payload = payloadFromState(BASE, STATE);
    expect(payload.place).toBe("Giza");
    expect(payload.title).toBe("A night");
    expect(payload.mag).toBe(5.5);
    expect(payload.when_utc).toBe(BASE.when_utc);
    expect(payload.q).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(payload.fov).toBe(42);
    expect(payload.sel).toBe("HIP:32349");
    expect(payload.layers["horizon"]).toBe(false);
    expect(payload.layers["below"]).toBe("hidden");
  });

  it("writes every layer flag so a default that changes later cannot change the link", () => {
    expect(Object.keys(layersToPayload(DEFAULT_LAYERS)).sort()).toEqual([
      "below",
      "cardinalDirections",
      "constellationLabels",
      "constellationLines",
      "equatorialGrid",
      "horizon",
    ]);
  });
});

describe("linkHash", () => {
  it("keeps the #e= prefix and round-trips through the decoder", () => {
    const hash = linkHash(BASE, STATE);
    expect(hash.startsWith("#e=")).toBe(true);
    const fragment = explorerFragmentFromHash(hash);
    expect(fragment).not.toBeNull();
    const back = decodeExplorer(fragment ?? "");
    expect(back.sel).toBe("HIP:32349");
    expect(back.fov).toBe(42);
    expect(back.layers["below"]).toBe("hidden");
    expect(back.layers["horizon"]).toBe(false);
  });
});

describe("absoluteLink", () => {
  it("joins the page address without its old hash to the new one", () => {
    expect(absoluteLink("#e=abc", { origin: "https://x.example", pathname: "/starsky/", search: "?a=1" })).toBe(
      "https://x.example/starsky/?a=1#e=abc",
    );
  });
});

describe("bindLink", () => {
  function fakeController() {
    const listeners = new Set<(c: { kind: string }) => void>();
    const state = { ...STATE };
    const controller = {
      getCamera: () => state.camera,
      getLayers: () => state.layers,
      getSelection: () => state.selection,
      subscribe: (l: (c: { kind: string }) => void) => {
        listeners.add(l);
        return () => {
          listeners.delete(l);
        };
      },
    };
    const emit = (kind: string): void => {
      listeners.forEach((l) => {
        l({ kind });
      });
    };
    return { controller: controller as unknown as ExplorerController, emit, state, listeners };
  }

  it("writes the link when the view settles, and only then", () => {
    const { controller, emit } = fakeController();
    const written: string[] = [];
    bindLink(controller, BASE, (hash) => written.push(hash));
    emit("selection");
    expect(written).toEqual([]);
    emit("settled");
    expect(written).toHaveLength(1);
    expect(written[0]?.startsWith("#e=")).toBe(true);
  });

  it("does not write the same link twice", () => {
    const { controller, emit } = fakeController();
    const written: string[] = [];
    bindLink(controller, BASE, (hash) => written.push(hash));
    emit("settled");
    emit("settled");
    expect(written).toHaveLength(1);
  });

  it("writes again when the view moved", () => {
    const { controller, emit, state } = fakeController();
    const written: string[] = [];
    bindLink(controller, BASE, (hash) => written.push(hash));
    emit("settled");
    state.camera = { ...state.camera, fovDeg: 20 };
    emit("settled");
    expect(written).toHaveLength(2);
  });

  it("stops when unbound", () => {
    const { controller, listeners } = fakeController();
    const off = bindLink(controller, BASE, () => undefined);
    off();
    expect(listeners.size).toBe(0);
  });
});
