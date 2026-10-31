/**
 * The story format on the SVG and PDF paths (BCR-0012, 012 T002).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { SharePayload } from "../share.ts";
import type { SkyModel, VisibleStar } from "../skymodel.ts";
import { buildPosterSvg, exportPdf, exportSvg } from "./export.ts";
import { storyMargin } from "./format.ts";

// DOMParser is only needed for the PDF path; other suites register the same
// globals, and registering twice throws.
if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

function star(o: Partial<VisibleStar> = {}): VisibleStar {
  return { hip: 1, raDeg: 10, decDeg: 20, mag: 1, unitX: 0, unitY: 0, px: 400, py: 400, size: 14, ...o };
}

const MODEL: SkyModel = {
  stars: [star(), star({ hip: 2, unitX: 0.2, unitY: -0.3, mag: 3.5, size: 5.6 })],
  figures: [
    { abbr: "ORI", name: "Orion", starIndices: [0, 1], centroidX: 400, centroidY: 400, brightestMag: 1, brightestHip: 1 },
  ],
  segments: [{ a: 0, b: 1, figure: 0 }],
  when: new Date("2026-01-01T00:00:00Z"),
};

const PAYLOAD: SharePayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square",
  when_utc: "2026-01-01T00:00:00Z",
  tz: "UTC",
  options: {
    projection: "stereographic",
    fisheye_strength: 1,
    min_separation: 0.008,
    magnitude_limit: 5.8,
    glow: true,
    glow_intensity: 1,
    constellations: true,
    constellation_labels: true,
    shape: "circle",
    title: "Story Night",
  },
};

describe("story SVG", () => {
  const svg = buildPosterSvg(PAYLOAD, MODEL, 1080, undefined, "story");

  it("is exactly 1080 x 1920", () => {
    expect(svg).toContain('width="1080" height="1920" viewBox="0 0 1080 1920"');
  });

  it("ignores a different sizePx: the story is always 1080 wide", () => {
    expect(buildPosterSvg(PAYLOAD, MODEL, 1600, undefined, "story")).toBe(svg);
  });

  it("paints the page background first, then translates the poster by the margin", () => {
    const bg = svg.indexOf('<rect width="100%" height="100%"');
    const group = svg.indexOf(`<g transform="translate(0, ${storyMargin(1080).toString()})">`);
    expect(bg).toBeGreaterThan(0);
    expect(group).toBeGreaterThan(bg);
    expect(svg.endsWith("</g></svg>")).toBe(true);
  });

  it("keeps the disc clip and the caption inside the translated group", () => {
    const group = svg.indexOf("translate(0,");
    expect(svg.indexOf('clip-path="url(#disc)"')).toBeGreaterThan(group);
    expect(svg.indexOf('<clipPath id="disc">')).toBeGreaterThan(group);
    expect(svg.indexOf("Story Night")).toBeGreaterThan(group);
  });

  it("is a well-formed document", () => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.getElementsByTagName("parsererror").length).toBe(0);
    expect(doc.documentElement.getAttribute("height")).toBe("1920");
  });

  it("exportSvg accepts the format", async () => {
    const blob = exportSvg(PAYLOAD, MODEL, 1080, "story");
    expect(await blob.text()).toBe(svg);
  });

  it("the standard SVG has no translated group", () => {
    expect(buildPosterSvg(PAYLOAD, MODEL, 1080)).not.toContain("translate(");
  });
});

describe("story PDF", () => {
  beforeAll(() => {
    // The PDF path fetches the bundled font subset by URL.
    const font = readFileSync(join(import.meta.dirname, "..", "..", "..", "public", "fonts", "CormorantGaramond-subset.ttf"));
    globalThis.fetch = ((): Promise<Response> =>
      Promise.resolve(new Response(font))) as unknown as typeof fetch;
  });

  async function pdfText(format: "standard" | "story"): Promise<string> {
    const blob = await exportPdf(PAYLOAD, MODEL, 1080, format);
    return Buffer.from(await blob.arrayBuffer()).toString("latin1");
  }

  it("is one page of 1080 x 1920 jsPDF px (MediaBox 1440 x 2560 pt) with the font embedded", async () => {
    const pdf = await pdfText("story");
    expect(pdf.match(/\/Type \/Page\b(?!s)/g)?.length).toBe(1);
    const box = /\/MediaBox \[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(pdf);
    expect(box).not.toBeNull();
    expect(Number(box?.[1])).toBeCloseTo(1440, 1);
    expect(Number(box?.[2])).toBeCloseTo(2560, 1);
    // Embedded, not substituted: the font file and its descriptor are in the document.
    expect(pdf).toContain("/FontName /Cormorant#20Garamond");
    expect(pdf).toContain("/FontFile2");
  });

  it("the standard page keeps its own size", async () => {
    const pdf = await pdfText("standard");
    const box = /\/MediaBox \[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(pdf);
    expect(Number(box?.[1])).toBeCloseTo(1440, 1);
    expect(Number(box?.[2])).toBeCloseTo(1440 * 1.22, 0);
  });
});
