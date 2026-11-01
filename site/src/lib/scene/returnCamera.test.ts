import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { loadReturnCamera, saveReturnCamera } = await import("./returnCamera.ts");

const SCENE = { lat: 51.5, lon: -0.12, when_utc: "2026-01-01T00:00:00Z" };
const CAMERA = { orientation: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number], fovDeg: 40 };

const realStorage = window.sessionStorage;

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: realStorage });
});

describe("return camera", () => {
  it("returns the camera saved for the same scene", () => {
    saveReturnCamera(SCENE, CAMERA);
    expect(loadReturnCamera(SCENE)).toEqual(CAMERA);
  });

  it("matches a moment written with milliseconds", () => {
    saveReturnCamera(SCENE, CAMERA);
    expect(loadReturnCamera({ ...SCENE, when_utc: "2026-01-01T00:00:00.000Z" })).toEqual(CAMERA);
  });

  it("is used only when lat, lon and moment all match", () => {
    saveReturnCamera(SCENE, CAMERA);
    expect(loadReturnCamera({ ...SCENE, lat: 51.6 })).toBeNull();
    expect(loadReturnCamera({ ...SCENE, lon: 0 })).toBeNull();
    expect(loadReturnCamera({ ...SCENE, when_utc: "2026-01-01T00:00:01Z" })).toBeNull();
  });

  it("is null when nothing was saved", () => {
    expect(loadReturnCamera(SCENE)).toBeNull();
  });

  it("ignores a stored value that is not a camera", () => {
    for (const bad of ["not json", "{}", JSON.stringify({ lat: 51.5, lon: -0.12, when_utc: SCENE.when_utc, q: [1, 2], fov: 40 }), JSON.stringify({ lat: 51.5, lon: -0.12, when_utc: SCENE.when_utc, q: [0, 0, 0, 0], fov: 40 })]) {
      window.sessionStorage.setItem("starsky.returnCamera", bad);
      expect(loadReturnCamera(SCENE)).toBeNull();
    }
  });

  it("tolerates storage that throws", () => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(() => {
      saveReturnCamera(SCENE, CAMERA);
    }).not.toThrow();
    expect(loadReturnCamera(SCENE)).toBeNull();
  });

  it("tolerates storage that is absent", () => {
    Object.defineProperty(window, "sessionStorage", { configurable: true, value: undefined });
    expect(() => {
      saveReturnCamera(SCENE, CAMERA);
    }).not.toThrow();
    expect(loadReturnCamera(SCENE)).toBeNull();
  });

  it("never touches the link", () => {
    const before = window.location.href;
    saveReturnCamera(SCENE, CAMERA);
    expect(window.location.href).toBe(before);
  });
});
