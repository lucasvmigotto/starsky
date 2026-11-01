import { describe, expect, it } from "bun:test";
import { type ExplorerCamera, lookAt, screenRay } from "../sky/camera.ts";
import { dot } from "../sky/vec.ts";
import { explorer } from "../../design/tokens.ts";
import { CTX, dirAt, sceneOf } from "./fixture.ts";
import { type FrameInput, type FramePlan, type StarBatch, planFrame } from "./frame.ts";
import { DEFAULT_LAYERS } from "./layers.ts";

const VIEWPORT = { width: 800, height: 600 };

/** Looking at the horizon due north, local up is up. */
function horizonCamera(fovDeg = 60, az = 0): ExplorerCamera {
  return { orientation: lookAt(dirAt(0, az), dirAt(90, 0)), fovDeg };
}

function planOf(
  stars: Parameters<typeof sceneOf>[0],
  overrides: Partial<FrameInput> = {},
  segments: Parameters<typeof sceneOf>[1] = [],
): FramePlan {
  const { scene, view } = sceneOf(stars, segments);
  return planFrame({
    scene,
    view,
    camera: horizonCamera(),
    viewport: VIEWPORT,
    layers: DEFAULT_LAYERS,
    magLimit: 6.5,
    selection: null,
    hover: null,
    ...overrides,
  });
}

function starCount(plan: FramePlan, dim?: boolean): number {
  return plan.stars
    .filter((b) => dim === undefined || b.dim === dim)
    .reduce((n, b) => n + b.xy.length / 2, 0);
}

describe("planFrame stars", () => {
  it("is deterministic", () => {
    const stars = [
      { hip: 1, dir: dirAt(10, 5), mag: 0.5 },
      { hip: 2, dir: dirAt(-4, -8), mag: 4 },
    ];
    expect(JSON.stringify(planOf(stars))).toBe(JSON.stringify(planOf(stars)));
  });

  it("draws a star in front at its projected position", () => {
    const plan = planOf([{ hip: 1, dir: dirAt(0, 0), mag: 1 }]);
    expect(starCount(plan)).toBe(1);
    const b = plan.stars[0];
    expect(b.xy[0]).toBeCloseTo(400, 6);
    expect(b.xy[1]).toBeCloseTo(300, 6);
  });

  it("culls stars behind the camera, outside the viewport and past the magnitude limit", () => {
    const plan = planOf([
      { hip: 1, dir: dirAt(0, 180), mag: 1 },
      { hip: 2, dir: dirAt(0, 50), mag: 1 },
      { hip: 3, dir: dirAt(0, 1), mag: 7 },
      { hip: 4, dir: dirAt(0, 1), mag: 6 },
    ]);
    expect(starCount(plan)).toBe(1);
  });

  it("makes brighter stars larger and puts a glow on the brightest only", () => {
    const plan = planOf([
      { hip: 1, dir: dirAt(2, 0), mag: -1.4 },
      { hip: 2, dir: dirAt(2, 3), mag: 5.5 },
    ]);
    const radii = plan.stars.map((b) => b.radius);
    expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));
    const bright = plan.stars.find((b) => b.radius === Math.max(...radii));
    const faint = plan.stars.find((b) => b.radius === Math.min(...radii));
    expect(bright?.glow).toBe(true);
    expect(faint?.glow).toBe(false);
  });
});

/** One star alone, drawn at the default field of view so the zoom factor is 1. */
function batchOf(mag: number, alt = 5): StarBatch {
  const plan = planOf([{ hip: 1, dir: dirAt(alt, 0), mag }], { camera: horizonCamera(100) });
  return plan.stars[0];
}

const shown = (b: StarBatch): number => b.alpha * (b.dim ? explorer.alpha.dim : 1);

describe("brighter stars (014 T002)", () => {
  it("grows radius as 3.6 - 0.5 mag, in half-pixel steps, between 0.8 and 4.5", () => {
    expect(batchOf(0).radius).toBe(3.5);
    expect(batchOf(2).radius).toBe(2.5);
    expect(batchOf(4).radius).toBe(1.5);
    expect(batchOf(-1.4).radius).toBe(4.5);
  });

  it("never draws a star under 0.8 px before zoom, however faint", () => {
    for (const mag of [5, 5.4, 6, 6.5]) expect(batchOf(mag).radius).toBeGreaterThanOrEqual(0.8);
    expect(batchOf(6.5).radius).toBe(1);
  });

  it("fades faint stars in tiers: full at magnitude 4, 0.6 at 6.5", () => {
    expect(batchOf(1).alpha).toBe(1);
    expect(batchOf(4).alpha).toBe(1);
    expect(batchOf(6.5).alpha).toBeCloseTo(0.6, 9);
    expect(batchOf(5.25).alpha).toBeCloseTo(0.8, 9);
    const tiers = new Set<number>();
    for (let mag = 4; mag <= 6.5; mag += 0.05) tiers.add(batchOf(mag).alpha);
    expect(tiers.size).toBeLessThanOrEqual(6);
  });

  it("gives a glow to magnitude 2 and brighter only, at alpha 0.25", () => {
    expect(batchOf(2).glow).toBe(true);
    expect(batchOf(1.2).glow).toBe(true);
    expect(batchOf(2.2).glow).toBe(false);
    expect(batchOf(3).glow).toBe(false);
    expect(explorer.alpha.glow).toBe(0.25);
  });

  it("keeps every below-horizon star dimmer than the faintest star above the horizon", () => {
    const brightestBelow = batchOf(-1.4, -10);
    const faintestAbove = batchOf(6.5, 10);
    expect(brightestBelow.dim).toBe(true);
    expect(shown(brightestBelow)).toBeLessThan(shown(faintestAbove));
  });

  it("derives the selection ring from the same radius", () => {
    const stars = [{ hip: 1, dir: dirAt(5, 0), mag: 1.3 }];
    const plan = planOf(stars, { camera: horizonCamera(100), selection: "HIP:1" });
    expect(plan.marks[0]?.radius).toBe((plan.stars[0]?.radius ?? 0) + 5);
  });

  it("keeps the batches few across a whole sky of magnitudes", () => {
    const stars = Array.from({ length: 400 }, (_, i) => ({
      hip: i + 1,
      dir: dirAt(((i * 7) % 60) - 20, (i * 13) % 50),
      mag: -1 + (i % 76) / 10,
    }));
    expect(planOf(stars, { camera: horizonCamera(100) }).stars.length).toBeLessThanOrEqual(60);
  });
});

describe("below the horizon", () => {
  const stars = [
    { hip: 1, dir: dirAt(5, 0), mag: 1 },
    { hip: 2, dir: dirAt(-5, 2), mag: 1 },
  ];

  it("dims below-horizon stars by default", () => {
    const plan = planOf(stars);
    expect(starCount(plan, false)).toBe(1);
    expect(starCount(plan, true)).toBe(1);
  });

  it("omits them when the layer is hidden", () => {
    const plan = planOf(stars, { layers: { ...DEFAULT_LAYERS, below: "hidden" } });
    expect(starCount(plan, false)).toBe(1);
    expect(starCount(plan, true)).toBe(0);
  });
});

describe("constellation lines", () => {
  const stars = [
    { hip: 1, dir: dirAt(5, -5), mag: 1 },
    { hip: 2, dir: dirAt(5, 5), mag: 2 },
    { hip: 3, dir: dirAt(-5, 5), mag: 2 },
    { hip: 4, dir: dirAt(1, 180), mag: 2 },
  ];
  const segments: [string, string, number, number][] = [
    ["Tst", "Test", 1, 2],
    ["Tst", "Test", 2, 3],
    ["Tst", "Test", 1, 4],
  ];

  it("draws segments, dims those that touch the horizon's far side, clips at the near plane", () => {
    const plan = planOf(stars, {}, segments);
    const normal = plan.lines.find((l) => !l.dim && !l.selected);
    const dim = plan.lines.find((l) => l.dim && !l.selected);
    expect(normal?.xy.length).toBeGreaterThan(0);
    expect(dim?.xy.length).toBeGreaterThan(0);
    const all = plan.lines.flatMap((l) => l.xy);
    expect(all.every((n) => Number.isFinite(n))).toBe(true);
    // 1-4 reaches behind the camera: it must be clipped, so it adds a third dim-free segment
    const segmentTotal = plan.lines.reduce((n, l) => n + l.xy.length / 4, 0);
    expect(segmentTotal).toBe(3);
  });

  it("drops a segment wholly behind the camera", () => {
    const plan = planOf(
      [
        { hip: 1, dir: dirAt(0, 170), mag: 1 },
        { hip: 2, dir: dirAt(0, 190), mag: 1 },
      ],
      {},
      [["Tst", "Test", 1, 2]],
    );
    expect(plan.lines.reduce((n, l) => n + l.xy.length, 0)).toBe(0);
  });

  it("hides segments that touch the below-horizon side when hidden", () => {
    const plan = planOf(stars, { layers: { ...DEFAULT_LAYERS, below: "hidden" } }, segments);
    expect(plan.lines.some((l) => l.dim)).toBe(false);
    expect(plan.lines.reduce((n, l) => n + l.xy.length / 4, 0)).toBe(2);
  });

  it("omits lines when the layer is off, and marks the selected constellation", () => {
    expect(planOf(stars, { layers: { ...DEFAULT_LAYERS, constellationLines: false } }, segments).lines).toEqual([]);
    const sel = planOf(stars, { selection: "CON:Tst" }, segments);
    expect(sel.lines.some((l) => l.selected)).toBe(true);
  });
});

describe("horizon, grid and cardinal points", () => {
  it("projects a horizon polyline whose vertices lie on the horizon", () => {
    const { scene, view } = sceneOf([]);
    const camera = horizonCamera(90);
    const plan = planFrame({
      scene, view, camera, viewport: VIEWPORT, layers: DEFAULT_LAYERS, magLimit: 6.5, selection: null, hover: null,
    });
    expect(plan.horizon.length).toBeGreaterThan(0);
    let nearCentre = false;
    for (const line of plan.horizon) {
      for (let i = 0; i < line.xy.length; i += 2) {
        const x = line.xy[i] ?? NaN;
        const y = line.xy[i + 1] ?? NaN;
        const ray = screenRay(camera, x, y, VIEWPORT.width, VIEWPORT.height);
        expect(Math.abs(dot(ray, view.zenith))).toBeLessThan(1e-9);
        if (Math.abs(x - 400) < 40 && Math.abs(y - 300) < 40) nearCentre = true;
      }
    }
    expect(nearCentre).toBe(true);
  });

  it("has no horizon when the layer is off, and draws a grid only when on", () => {
    const { scene, view } = sceneOf([]);
    const base = {
      scene, view, camera: horizonCamera(90), viewport: VIEWPORT, magLimit: 6.5, selection: null, hover: null,
    };
    expect(planFrame({ ...base, layers: { ...DEFAULT_LAYERS, horizon: false } }).horizon).toEqual([]);
    expect(planFrame({ ...base, layers: DEFAULT_LAYERS }).grid).toEqual([]);
    const grid = planFrame({ ...base, layers: { ...DEFAULT_LAYERS, equatorialGrid: true } }).grid;
    expect(grid.length).toBeGreaterThan(0);
    expect(grid.flatMap((l) => l.xy).every(Number.isFinite)).toBe(true);
  });

  it("labels only the cardinal points in front of the camera, from the observer", () => {
    const { scene, view } = sceneOf([]);
    const base = { scene, view, viewport: VIEWPORT, layers: DEFAULT_LAYERS, magLimit: 6.5, selection: null, hover: null };
    const north = planFrame({ ...base, camera: horizonCamera(60, 0) });
    expect(north.cardinals.map((c) => c.text)).toEqual(["N"]);
    expect(north.cardinals[0]?.x).toBeCloseTo(400, 6);
    expect(north.cardinals[0]?.y).toBeCloseTo(300, 6);
    const east = planFrame({ ...base, camera: horizonCamera(60, 90) });
    expect(east.cardinals.map((c) => c.text)).toEqual(["E"]);
    const off = planFrame({ ...base, camera: horizonCamera(60, 0), layers: { ...DEFAULT_LAYERS, cardinalDirections: false } });
    expect(off.cardinals).toEqual([]);
  });

  it("uses the supplied cardinal text", () => {
    const { scene, view } = sceneOf([]);
    const plan = planFrame({
      scene, view, camera: horizonCamera(60, 180), viewport: VIEWPORT, layers: DEFAULT_LAYERS,
      magLimit: 6.5, selection: null, hover: null, cardinalText: ["Nn", "Ee", "Ss", "Ww"],
    });
    expect(plan.cardinals.map((c) => c.text)).toEqual(["Ss"]);
  });
});

describe("selection marks", () => {
  it("rings the selected star, with its name or HIP number", () => {
    const stars = [
      { hip: 32349, dir: dirAt(3, 0), mag: -1.4 },
      { hip: 99, dir: dirAt(3, 4), mag: 3 },
    ];
    const { scene, view } = sceneOf(stars, [], [[32349, "Sirius"]]);
    const base = { scene, view, camera: horizonCamera(), viewport: VIEWPORT, layers: DEFAULT_LAYERS, magLimit: 6.5, hover: null };
    const named = planFrame({ ...base, selection: "HIP:32349" });
    expect(named.marks).toHaveLength(1);
    expect(named.marks[0]?.kind).toBe("selected");
    expect(named.marks[0]?.label).toBe("Sirius");
    const plain = planFrame({ ...base, selection: "HIP:99" });
    expect(plain.marks[0]?.label).toBe("HIP 99");
  });

  it("marks a hovered star without a label and draws nothing off screen", () => {
    const stars = [{ hip: 1, dir: dirAt(0, 0), mag: 2 }, { hip: 2, dir: dirAt(0, 180), mag: 2 }];
    expect(planOf(stars, { hover: "HIP:1" }).marks[0]).toMatchObject({ kind: "hover", label: null });
    expect(planOf(stars, { selection: "HIP:2" }).marks).toEqual([]);
  });

  it("keeps a below-horizon selection dim, and omits it when hidden", () => {
    const stars = [{ hip: 1, dir: dirAt(-6, 0), mag: 2 }];
    expect(planOf(stars, { selection: "HIP:1" }).marks[0]?.dim).toBe(true);
    expect(planOf(stars, { selection: "HIP:1", layers: { ...DEFAULT_LAYERS, below: "hidden" } }).marks).toEqual([]);
  });
});

describe("camera agreement", () => {
  it("places stars exactly where the camera projects them", () => {
    const camera = horizonCamera(70, 10);
    const star = { hip: 1, dir: dirAt(7, 14), mag: 2 };
    const plan = planOf([star], { camera });
    const ray = screenRay(camera, plan.stars[0]?.xy[0] ?? 0, plan.stars[0]?.xy[1] ?? 0, 800, 600);
    expect(dot(ray, star.dir)).toBeGreaterThan(1 - 1e-12);
    expect(CTX.latDeg).toBe(40);
  });
});
