import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  OSM_COPYRIGHT_URL,
  OSM_FIXTHEMAP_URL,
  TILE_MAX_ZOOM,
  TILE_URL_TEMPLATE,
} from "./map-config.ts";

const SRC = join(import.meta.dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("map policy (ADR-0008)", () => {
  it("uses the standard OSM tile URL", () => {
    expect(TILE_URL_TEMPLATE).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(TILE_MAX_ZOOM).toBeLessThanOrEqual(19);
  });

  it("points the attribution at the copyright and fixthemap pages", () => {
    expect(OSM_COPYRIGHT_URL).toBe("https://www.openstreetmap.org/copyright");
    expect(OSM_FIXTHEMAP_URL).toBe("https://www.openstreetmap.org/fixthemap");
  });

  it("names the tile host in exactly one source file", () => {
    const hits = sourceFiles(SRC).filter((f) => readFileSync(f, "utf8").includes("tile.openstreetmap.org"));
    expect(hits.map((f) => f.slice(SRC.length))).toEqual(["/lib/landing/map-config.ts"]);
  });

  it("never strips the Referer from a tile request", () => {
    const lazy = readFileSync(join(SRC, "components", "landing", "leafletMap.ts"), "utf8");
    expect(lazy).not.toMatch(/referrerPolicy|no-referrer/i);
    expect(lazy).not.toMatch(/\.(prefetch|seed)|serviceWorker|caches\./);
  });

  it("imports Leaflet from the lazy module alone", () => {
    const importers = sourceFiles(SRC).filter((f) => /from "leaflet|import "leaflet/.test(readFileSync(f, "utf8")));
    expect(importers.map((f) => f.slice(SRC.length))).toEqual(["/components/landing/leafletMap.ts"]);
  });

  it("loads the lazy module only through a dynamic import", () => {
    const static_ = sourceFiles(SRC).filter((f) => /^import .*leafletMap/m.test(readFileSync(f, "utf8")));
    expect(static_.map((f) => f.slice(SRC.length))).toEqual([]);
  });
});
