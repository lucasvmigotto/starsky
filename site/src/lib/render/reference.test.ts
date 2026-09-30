/**
 * Reference-image suite — the renderer's regression guard.
 *
 * Renders `specs/007-renderer-export/fixtures/render-matrix.json` through the
 * real renderer and checks two things per case:
 *
 * 1. **structure** — star / segment / figure counts and the caption string, all
 *    asserted exactly. This is the primary guard: a silent count change is the
 *    bug class this suite exists to catch.
 * 2. **pixels** — the rendered PNG against the stored reference in
 *    `__references__/`, within `tolerance.channel_mean_abs`.
 *
 * Regenerate the references deliberately (after reviewing every diff):
 *
 *     STARSKY_UPDATE_REFERENCE=1 bun test src/lib/render/reference.test.ts
 *
 * **What this does NOT cover.** It runs on `@napi-rs/canvas`, not Chrome or
 * Firefox, so it cannot see browser-specific rasterisation, font fallback, or
 * whether a download actually happens. Those belong to the Playwright journeys
 * (`site/e2e/`). A green run here means the renderer is unchanged, not that the
 * site works in a browser.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";
import { formatDetailLine } from "../caption.ts";
import { buildSkyModel, type SegmentRow, type StarRow } from "../skymodel.ts";
import type { SharePayload } from "../share.ts";
import { renderPoster } from "./poster.ts";

// Register the bundled poster font with the canvas library, as the Python
// renderer used to with `fontManager.addfont`.
//
// Without this the canvas silently substitutes a system sans-serif: measured
// 2026-09-30, the host and the container drew `ANDROMEDA` in *different* sans
// faces, so the suite compared the wrong typeface against the wrong typeface —
// and its references encoded neither the product's face nor a stable
// environment. The browser is unaffected (it loads the face via `@font-face`);
// this is the Node/canvas path only.
//
// Four levels up: site/src/lib/render/ → repo root.
const POSTER_FONT = new URL(
  "../../../../assets/fonts/CormorantGaramond.ttf",
  import.meta.url,
).pathname;
if (!GlobalFonts.has("Cormorant Garamond")) {
  const registered = GlobalFonts.registerFromPath(
    POSTER_FONT,
    "Cormorant Garamond",
  );
  if (registered === null) {
    throw new Error(
      `could not register the bundled poster font at ${POSTER_FONT}; ` +
        "the suite would otherwise compare fallback glyphs",
    );
  }
}

interface CaseExpected {
  stars: number;
  segments: number;
  figures: number;
  caption?: string;
}
interface MatrixCase {
  id: string;
  lat: number;
  lon: number;
  place: string | null;
  when_utc: string;
  tz: string;
  options: Partial<SharePayload["options"]>;
  size_px: number;
  expected: CaseExpected;
}
interface Matrix {
  version: number;
  tolerance: {
    channel_mean_abs: number;
    changed_fraction: number;
    notes: string;
  };
  cases: MatrixCase[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const REFERENCE_DIR = join(HERE, "__references__");
const DATA_DIR = join(ROOT, "site", "public", "data");
const REFERENCE_PREVIEW = { diskCx: 400, diskCy: 400, diskR: 368 };
const UPDATE = process.env["STARSKY_UPDATE_REFERENCE"] === "1";

function readMatrix(): Matrix {
  const raw = readFileSync(
    join(ROOT, "specs", "007-renderer-export", "fixtures", "render-matrix.json"),
    "utf-8",
  );
  const fenced = raw.match(/```json\n([\s\S]*?)\n```/);
  return JSON.parse(fenced ? fenced[1] : raw) as Matrix;
}

function readData(): { catalog: StarRow[]; segments: SegmentRow[] } {
  const catalog = (
    JSON.parse(readFileSync(join(DATA_DIR, "catalog.json"), "utf-8")) as {
      stars: number[][];
    }
  ).stars.map((r): StarRow => ({ hip: r[0], raDeg: r[1], decDeg: r[2], mag: r[3] }));
  const segments = (
    JSON.parse(readFileSync(join(DATA_DIR, "constellations.json"), "utf-8")) as {
      segments: SegmentRow[];
    }
  ).segments;
  return { catalog, segments };
}

function payloadFor(c: MatrixCase): SharePayload {
  return {
    v: 1,
    lat: c.lat,
    lon: c.lon,
    place: c.place,
    when_utc: c.when_utc,
    tz: c.tz,
    options: {
      projection: "stereographic",
      fisheye_strength: 1.0,
      min_separation: 0.008,
      magnitude_limit: 5.8,
      glow: true,
      glow_intensity: 1.0,
      constellations: true,
      constellation_labels: true,
      shape: "circle",
      title: null,
      ...c.options,
    },
  };
}

interface RenderResult {
  pixels: Uint8ClampedArray;
  png: Buffer;
  width: number;
  height: number;
  stars: number;
  segments: number;
  figures: number;
  caption: string;
}

function renderCase(c: MatrixCase): RenderResult {
  const { catalog, segments } = readData();
  const payload = payloadFor(c);
  const model = buildSkyModel(payload, catalog, segments);
  const width = c.size_px;
  const height = Math.round(c.size_px * 1.22);
  const canvas = createCanvas(width, height);
  renderPoster(
    canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
    payload,
    model,
    c.size_px,
    1,
    REFERENCE_PREVIEW,
  );
  return {
    pixels: canvas.getContext("2d").getImageData(0, 0, width, height).data,
    png: canvas.toBuffer("image/png"),
    width,
    height,
    stars: model.stars.length,
    segments: model.segments.length,
    figures: model.figures.length,
    caption: formatDetailLine(c.lat, c.lon, c.place, c.when_utc, c.tz),
  };
}

async function decodePixels(
  png: Buffer,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const image = await loadImage(png);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, width, height).data;
}

function channelDiff(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
): { meanAbs: number; maxAbs: number; changedFraction: number } {
  let sum = 0;
  let max = 0;
  let changed = 0;
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (i % 4 === 3) continue;
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > max) max = d;
    // Any visible difference counts; the mean alone dilutes a change confined
    // to thin features (a ring, a line) below the bar — measured: quadrupling
    // the ring width moved 20k pixels but only pushed meanAbs from 0 to 7.97.
    if (d > 2) changed += 1;
    n += 1;
  }
  return { meanAbs: sum / n, maxAbs: max, changedFraction: changed / n };
}

const matrix = readMatrix();

describe("render matrix — structure (the primary guard)", () => {
  for (const c of matrix.cases) {
    it(`${c.id}: star, segment and figure counts match`, () => {
      const r = renderCase(c);
      expect(r.stars).toBe(c.expected.stars);
      expect(r.segments).toBe(c.expected.segments);
      expect(r.figures).toBe(c.expected.figures);
    });

    const expectedCaption = c.expected.caption;
    if (expectedCaption !== undefined) {
      it(`${c.id}: caption is unchanged`, () => {
        expect(renderCase(c).caption).toBe(expectedCaption);
      });
    }
  }
});

describe("render matrix — pixels", () => {
  for (const c of matrix.cases) {
    it(`${c.id}: matches its stored reference`, async () => {
      const r = renderCase(c);
      const reference = join(REFERENCE_DIR, `${c.id}.png`);
      const missing = !existsSync(reference);

      if (UPDATE || missing) {
        mkdirSync(REFERENCE_DIR, { recursive: true });
        writeFileSync(reference, r.png);
        if (missing && !UPDATE) {
          // Writing a first reference must not look like a passed check.
          throw new Error(
            `wrote a missing reference for ${c.id}; review and commit it, then re-run`,
          );
        }
        return;
      }

      const stored = await decodePixels(
        readFileSync(reference),
        r.width,
        r.height,
      );
      const { meanAbs, changedFraction } = channelDiff(stored, r.pixels);
      const tol = matrix.tolerance;
      expect(
        changedFraction,
        `${c.id}: ${(changedFraction * 100).toFixed(2)}% of pixels changed, ` +
          `over the ${(tol.changed_fraction * 100).toString()}% budget ` +
          `(meanAbs ${meanAbs.toFixed(2)})`,
      ).toBeLessThanOrEqual(tol.changed_fraction);
      expect(
        meanAbs,
        `${c.id}: meanAbs ${meanAbs.toFixed(2)} exceeds tolerance ` +
          tol.channel_mean_abs.toString(),
      ).toBeLessThanOrEqual(tol.channel_mean_abs);
    });
  }
});
