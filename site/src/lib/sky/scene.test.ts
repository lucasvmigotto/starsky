import { describe, expect, it } from "bun:test";
import type { SegmentRow, StarRow } from "../skymodel.ts";
import { prepareScene } from "./scene.ts";
import { raDecToVec } from "./vec.ts";

const STARS: StarRow[] = [
  { hip: 100, raDeg: 10, decDeg: 20, mag: 2.0 },
  { hip: 200, raDeg: 20, decDeg: -80, mag: 1.0 }, // far south: below many horizons
  { hip: 300, raDeg: 350, decDeg: 5, mag: 3.0 },
  { hip: 400, raDeg: 90, decDeg: 0, mag: 0.5 }, // in no figure
  { hip: 500, raDeg: 180, decDeg: 45, mag: 4.0 },
];

const SEGMENTS: SegmentRow[] = [
  ["Aaa", "Alpha", 100, 200],
  ["Aaa", "Alpha", 200, 300],
  ["Bbb", "Beta", 300, 500],
  ["Bbb", "Beta", 500, 999], // 999 is not in the catalog: dropped
  ["Ccc", "Gamma", 888, 999], // nothing survives: constellation dropped
];

const NAMES: [number, string][] = [
  [200, "Canopus-ish"],
  [777, "Not in catalog"],
];

describe("prepareScene", () => {
  const scene = prepareScene(STARS, SEGMENTS, NAMES);

  it("keeps every input star, in order, with stable ids and names", () => {
    expect(scene.stars.map((s) => s.id)).toEqual([
      "HIP:100",
      "HIP:200",
      "HIP:300",
      "HIP:400",
      "HIP:500",
    ]);
    expect(scene.stars[1].name).toBe("Canopus-ish");
    expect(scene.stars[0].name).toBeNull();
    expect(scene.stars[1].decDeg).toBe(-80);
  });

  it("stores unit vectors in a Float64Array indexed by star order", () => {
    expect(scene.vectors).toBeInstanceOf(Float64Array);
    expect(scene.vectors.length).toBe(STARS.length * 3);
    STARS.forEach((s, i) => {
      const expected = raDecToVec(s.raDeg, s.decDeg);
      for (let k = 0; k < 3; k += 1) {
        expect(scene.vectors[i * 3 + k]).toBeCloseTo(expected[k] ?? NaN, 14);
      }
    });
  });

  it("drops segments with missing stars and constellations left empty", () => {
    expect(scene.constellations.map((c) => c.id)).toEqual(["CON:Aaa", "CON:Bbb"]);
    const bbb = scene.constellations[1];
    expect(bbb.segments).toEqual([[2, 4]]);
    expect(bbb.memberIndices).toEqual([2, 4]);
  });

  it("describes each constellation", () => {
    const aaa = scene.constellations[0];
    expect(aaa.abbr).toBe("Aaa");
    expect(aaa.name).toBe("Alpha");
    expect(aaa.memberIndices).toEqual([0, 1, 2]);
    expect(aaa.segments).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(aaa.brightestIndex).toBe(1);
  });

  it("makes membership figure-based only", () => {
    expect(scene.stars[3].constellationIds).toEqual([]);
    expect(scene.stars[2].constellationIds).toEqual(["CON:Aaa", "CON:Bbb"]);
    expect(scene.stars[0].constellationIds).toEqual(["CON:Aaa"]);
  });

  it("offers id lookups", () => {
    expect(scene.starIndexById.get("HIP:500")).toBe(4);
    expect(scene.starIndexById.get("HIP:999")).toBeUndefined();
    expect(scene.constellationIndexById.get("CON:Bbb")).toBe(1);
  });

  it("does not mutate its inputs", () => {
    const stars = structuredClone(STARS);
    const segs = structuredClone(SEGMENTS);
    const names = structuredClone(NAMES);
    prepareScene(stars, segs, names);
    expect(stars).toEqual(STARS);
    expect(segs).toEqual(SEGMENTS);
    expect(names).toEqual(NAMES);
  });

  it("handles empty input", () => {
    const empty = prepareScene([], [], []);
    expect(empty.stars).toEqual([]);
    expect(empty.constellations).toEqual([]);
    expect(empty.vectors.length).toBe(0);
  });
});
