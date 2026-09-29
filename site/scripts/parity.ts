/**
 * Browser↔CLI parity harness (refactor Slice 3).
 *
 * Renders the fixture matrix through the *TypeScript* poster pipeline and
 * compares each case against the PNGs the CLI produced with
 * `scripts/render_parity_fixtures.py`, using the tolerance in
 * `specs/007-renderer-export/fixtures/parity.json`.
 *
 * The renderer needs a Canvas; Bun has none, so this needs
 * `@napi-rs/canvas` (`bun add -d @napi-rs/canvas`). Without it the harness
 * reports that it cannot run — it never reports a pass it did not measure.
 *
 * Usage:
 *   bun run scripts/parity.ts --cli /tmp/starpy-parity-cli
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { buildSkyModel, type SegmentRow, type StarRow } from "../src/lib/skymodel.ts";
import type { SharePayload } from "../src/lib/share.ts";
import { renderPoster } from "../src/lib/render/poster.ts";

interface Tolerance {
  channel_mean_abs: number;
  channel_max_excluding_edges: number;
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
}
interface Matrix {
  version: number;
  tolerance: Tolerance;
  cases: MatrixCase[];
}
interface CliManifest {
  cases: { id: string; file: string; size: number[] }[];
}

/** `scripts/parity.ts` lives in `site/`; repo-root paths need two levels up. */
const ROOT = new URL("../../", import.meta.url).pathname;
const DATA = join(ROOT, "site/public/data");

function parseArgs(argv: string[]): { cli: string | null } {
  let cli: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--cli") cli = argv[i + 1] ?? null;
  }
  return { cli };
}

function readFencedJson(path: string): unknown {
  const raw = readFileSync(path, "utf-8");
  const fence = raw.match(/```json\n([\s\S]*?)\n```/);
  return JSON.parse(fence ? fence[1] : raw) as unknown;
}

function payloadFromCase(c: MatrixCase): SharePayload {
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

/** Per-channel mean and max absolute difference over RGB, alpha ignored. */
function channelDiff(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
): { meanAbs: number; maxAbs: number } {
  let sum = 0;
  let max = 0;
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (i % 4 === 3) continue;
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > max) max = d;
    n += 1;
  }
  return { meanAbs: sum / n, maxAbs: max };
}

interface PixelSource {
  width: number;
  height: number;
  getContext: (type: "2d") => {
    getImageData: (
      x: number,
      y: number,
      w: number,
      h: number,
    ) => { data: Uint8ClampedArray };
  };
}

function readPixels(canvas: PixelSource): Uint8ClampedArray {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
    .data;
}

async function main(): Promise<number> {
  const { cli } = parseArgs(process.argv.slice(2));
  const matrix = readFencedJson(
    join(ROOT, "specs/007-renderer-export/fixtures/parity.json"),
  ) as Matrix;
  const catalog = (
    JSON.parse(readFileSync(join(DATA, "catalog.json"), "utf-8")) as {
      stars: number[][];
    }
  ).stars.map((r): StarRow => ({ hip: r[0], raDeg: r[1], decDeg: r[2], mag: r[3] }));
  const segments = (
    JSON.parse(readFileSync(join(DATA, "constellations.json"), "utf-8")) as {
      segments: SegmentRow[];
    }
  ).segments;

  if (!cli || !existsSync(join(cli, "manifest.json"))) {
    console.log("parity: --cli <dir> with manifest.json is required to compare");
    return 1;
  }
  const manifest = JSON.parse(
    readFileSync(join(cli, "manifest.json"), "utf-8"),
  ) as CliManifest;

  const outDir = process.env["STARPY_PARITY_OUT"] ?? "/tmp/starpy-parity-ts";
  mkdirSync(outDir, { recursive: true });

  let failures = 0;
  for (const c of matrix.cases) {
    const payload = payloadFromCase(c);
    const model = buildSkyModel(payload, catalog, segments);
    const height = Math.round(c.size_px * 1.22);
    const canvas = createCanvas(c.size_px, height);
    renderPoster(
      canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      payload,
      model,
      c.size_px,
      1,
      {
        diskCx: c.size_px / 2,
        diskCy: c.size_px / 2,
        diskR: (c.size_px / 800) * 368,
      },
    );
    writeFileSync(join(outDir, `${c.id}.png`), canvas.toBuffer("image/png"));

    const entry = manifest.cases.find((m) => m.id === c.id);
    if (!entry) {
      console.log(`parity: ${c.id} — FAIL (no CLI render in manifest)`);
      failures += 1;
      continue;
    }
    const cliPath = join(cli, entry.file);
    if (!existsSync(cliPath)) {
      console.log(`parity: ${c.id} — FAIL (missing ${cliPath})`);
      failures += 1;
      continue;
    }
    const cliImage = await loadImage(cliPath);
    const cliCanvas = createCanvas(cliImage.width, cliImage.height);
    cliCanvas.getContext("2d").drawImage(cliImage, 0, 0);
    const { meanAbs, maxAbs } = channelDiff(
      cliCanvas
        .getContext("2d")
        .getImageData(0, 0, cliCanvas.width, cliCanvas.height).data,
      readPixels(canvas),
    );
    const ok = meanAbs <= matrix.tolerance.channel_mean_abs;
    failures += ok ? 0 : 1;
    console.log(
      `parity: ${c.id} — meanAbs=${meanAbs.toFixed(2)} ` +
        `maxAbs=${maxAbs.toString()} ${ok ? "PASS" : "FAIL"}`,
    );
  }

  console.log(
    failures === 0
      ? `parity: all ${matrix.cases.length.toString()} cases within tolerance`
      : `parity: ${failures.toString()} case(s) outside tolerance`,
  );
  return failures === 0 ? 0 : 1;
}

process.exitCode = await main();
