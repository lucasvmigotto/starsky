import { describe, expect, it } from "bun:test";
import type { SegmentRow } from "../skymodel.ts";
import { constellationTip, figureStars } from "./figure.ts";
import { dirAt, sceneOf } from "./fixture.ts";

/** A chain figure "Tst" through the given HIP numbers, so every star is a member. */
function chain(hips: readonly number[]): SegmentRow[] {
  const out: SegmentRow[] = [];
  for (let i = 1; i < hips.length; i++) out.push(["Tst", "Test", hips[i - 1] ?? 0, hips[i] ?? 0]);
  return out;
}

function sky(stars: readonly { hip: number; mag: number; alt?: number }[], names: readonly (readonly [number, string])[]) {
  return sceneOf(
    stars.map((s, i) => ({ hip: s.hip, mag: s.mag, dir: dirAt(s.alt ?? 30, i * 5) })),
    chain(stars.map((s) => s.hip)),
    names,
  );
}

describe("constellationTip", () => {
  it("names the three brightest named stars, brightest first, and counts the rest", () => {
    const { scene } = sky(
      [
        { hip: 1, mag: 3 },
        { hip: 2, mag: 0.5 },
        { hip: 3, mag: 1 },
        { hip: 4, mag: 2 },
        { hip: 5, mag: 0.1 },
        { hip: 6, mag: 4 },
      ],
      [
        [1, "Aaa"],
        [2, "Bbb"],
        [3, "Ccc"],
        [4, "Ddd"],
      ],
    );
    // HIP 5 is the brightest but has no name: it is not listed, and it is in the rest.
    expect(constellationTip(scene, "CON:Tst")).toEqual({ name: "Test", count: 6, named: ["Bbb", "Ccc", "Ddd"], rest: 3 });
  });

  it("has nothing to add when the figure has no named star", () => {
    const { scene } = sky(
      [
        { hip: 1, mag: 1 },
        { hip: 2, mag: 2 },
      ],
      [],
    );
    expect(constellationTip(scene, "CON:Tst")).toEqual({ name: "Test", count: 2, named: [], rest: 0 });
  });

  it("leaves no rest when exactly three stars are named and there are no others", () => {
    const { scene } = sky(
      [
        { hip: 1, mag: 2 },
        { hip: 2, mag: 1 },
        { hip: 3, mag: 3 },
      ],
      [
        [1, "One"],
        [2, "Two"],
        [3, "Three"],
      ],
    );
    expect(constellationTip(scene, "CON:Tst")).toEqual({ name: "Test", count: 3, named: ["Two", "One", "Three"], rest: 0 });
  });

  it("counts unnamed stars in the rest when fewer than three are named", () => {
    const { scene } = sky(
      [
        { hip: 1, mag: 2 },
        { hip: 2, mag: 1 },
        { hip: 3, mag: 3 },
      ],
      [[3, "Faint"]],
    );
    expect(constellationTip(scene, "CON:Tst")).toEqual({ name: "Test", count: 3, named: ["Faint"], rest: 2 });
  });

  it("breaks a tie in magnitude by the lower HIP number", () => {
    const { scene } = sky(
      [
        { hip: 9, mag: 1 },
        { hip: 4, mag: 1 },
        { hip: 7, mag: 1 },
        { hip: 2, mag: 1 },
      ],
      [
        [9, "Nine"],
        [4, "Four"],
        [7, "Seven"],
        [2, "Two"],
      ],
    );
    expect(constellationTip(scene, "CON:Tst")?.named).toEqual(["Two", "Four", "Seven"]);
  });

  it("returns null for a star or an unknown id", () => {
    const { scene } = sky(
      [
        { hip: 1, mag: 1 },
        { hip: 2, mag: 2 },
      ],
      [],
    );
    expect(constellationTip(scene, "HIP:1")).toBeNull();
    expect(constellationTip(scene, "CON:Xyz")).toBeNull();
  });
});

describe("figureStars", () => {
  it("lists every member brightest first, by name or HIP number, with the horizon", () => {
    const { scene, view } = sky(
      [
        { hip: 10, mag: 2.5 },
        { hip: 11, mag: 0.25, alt: -10 },
        { hip: 12, mag: 4 },
        { hip: 13, mag: 1 },
      ],
      [[13, "Named"]],
    );
    expect(figureStars(scene, view, "CON:Tst")).toEqual([
      { id: "HIP:11", title: "HIP 11", mag: 0.25, below: true },
      { id: "HIP:13", title: "Named", mag: 1, below: false },
      { id: "HIP:10", title: "HIP 10", mag: 2.5, below: false },
      { id: "HIP:12", title: "HIP 12", mag: 4, below: false },
    ]);
  });

  it("returns null for a star or an unknown id", () => {
    const { scene, view } = sky(
      [
        { hip: 1, mag: 1 },
        { hip: 2, mag: 2 },
      ],
      [],
    );
    expect(figureStars(scene, view, "HIP:1")).toBeNull();
    expect(figureStars(scene, view, "CON:Xyz")).toBeNull();
  });
});
