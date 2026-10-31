/**
 * Per-tab memory of where the Explorer was looking, so "Return to Explorer"
 * can put the visitor back (FR-004). `sessionStorage` only, keyed by the scene
 * it was taken in, used only on an exact match, and never written to a link.
 * Storage can be absent or throw (private windows, blocked site data); every
 * access is guarded and a miss simply means the initial view.
 */
import type { ExplorerCamera } from "../sky/camera.ts";
import { normalize } from "../sky/quat.ts";
import { normalizeWhen } from "./convert.ts";

const KEY = "starsky.returnCamera";

export interface SceneKey {
  lat: number;
  lon: number;
  when_utc: string;
}

function whenKey(whenUtc: string): string | null {
  try {
    return normalizeWhen(whenUtc);
  } catch {
    return null;
  }
}

export function saveReturnCamera(scene: SceneKey, camera: ExplorerCamera): void {
  try {
    const when_utc = whenKey(scene.when_utc);
    if (when_utc === null) return;
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({
        lat: scene.lat,
        lon: scene.lon,
        when_utc,
        q: camera.orientation,
        fov: camera.fovDeg,
      }),
    );
  } catch {
    // No storage: the return trip falls back to the initial view.
  }
}

/** The camera saved for exactly this scene, or null. */
export function loadReturnCamera(scene: SceneKey): ExplorerCamera | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;
    if (
      record["lat"] !== scene.lat ||
      record["lon"] !== scene.lon ||
      record["when_utc"] !== whenKey(scene.when_utc)
    ) {
      return null;
    }
    const q = record["q"];
    const fov = record["fov"];
    if (
      !Array.isArray(q) ||
      q.length !== 4 ||
      !q.every((c) => typeof c === "number" && Number.isFinite(c)) ||
      typeof fov !== "number" ||
      !Number.isFinite(fov)
    ) {
      return null;
    }
    const [x = 0, y = 0, z = 0, w = 1] = q as number[];
    if (Math.hypot(x, y, z, w) < 1e-6) return null;
    return { orientation: normalize([x, y, z, w]), fovDeg: fov };
  } catch {
    return null;
  }
}
