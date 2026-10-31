import { describe, expect, it } from "bun:test";
import { CTX, dirAt, sceneOf } from "./fixture.ts";
import { describeConstellation, describeStar, listConstellations } from "./inspect.ts";
import { prepareObserverView } from "./observerView.ts";

const SEGMENTS: [string, string, number, number][] = [
  ["Ori", "Orion", 1, 2],
  ["Ori", "Orion", 2, 3],
];

function world() {
  return sceneOf(
    [
      { hip: 1, dir: dirAt(40, 90), mag: 0.5 },
      { hip: 2, dir: dirAt(10, 100), mag: 2 },
      { hip: 3, dir: dirAt(-20, 110), mag: 3 },
      { hip: 4, dir: dirAt(60, 0), mag: 4.25 },
    ],
    SEGMENTS,
    [[1, "Rigel"]],
  );
}

describe("describeStar", () => {
  it("gives catalog facts and, apart from them, derived values", () => {
    const { scene } = world();
    const star = describeStar(scene, CTX, "HIP:1");
    expect(star).not.toBeNull();
    expect(star?.title).toBe("Rigel");
    expect(star?.name).toBe("Rigel");
    expect(star?.hip).toBe(1);
    expect(star?.mag).toBe(0.5);
    expect(star?.horizon).toBe("above");
    expect(star?.altDeg).toBeCloseTo(40, 0);
    expect(star?.azDeg).toBeCloseTo(90, 0);
  });

  it("rounds altitude and azimuth to 0.1 degree", () => {
    const { scene } = world();
    const star = describeStar(scene, CTX, "HIP:1");
    expect(star?.altDeg).toBe(Math.round((star?.altDeg ?? 0) * 10) / 10);
    expect(star?.azDeg).toBe(Math.round((star?.azDeg ?? 0) * 10) / 10);
  });

  it("titles a star without a name by its HIP number and omits the name", () => {
    const { scene } = world();
    const star = describeStar(scene, CTX, "HIP:4");
    expect(star?.title).toBe("HIP 4");
    expect(star?.name).toBeNull();
  });

  it("reports a star under the horizon as below it", () => {
    const { scene } = world();
    const star = describeStar(scene, CTX, "HIP:3");
    expect(star?.horizon).toBe("below");
    expect(star?.altDeg).toBeLessThan(0);
  });

  it("lists figures only where a figure uses the star", () => {
    const { scene } = world();
    expect(describeStar(scene, CTX, "HIP:2")?.figures).toEqual([{ id: "CON:Ori", name: "Orion" }]);
    expect(describeStar(scene, CTX, "HIP:4")?.figures).toEqual([]);
  });

  it("returns null for ids it does not know", () => {
    const { scene } = world();
    expect(describeStar(scene, CTX, "HIP:999")).toBeNull();
    expect(describeStar(scene, CTX, "CON:Ori")).toBeNull();
  });
});

describe("describeConstellation", () => {
  it("counts the stars in the figure and those above the horizon now", () => {
    const { scene } = world();
    const view = prepareObserverView(scene, CTX);
    const con = describeConstellation(scene, view, "CON:Ori");
    expect(con?.name).toBe("Orion");
    expect(con?.abbr).toBe("Ori");
    expect(con?.starCount).toBe(3);
    expect(con?.aboveCount).toBe(2);
  });

  it("names the brightest star with its magnitude", () => {
    const { scene } = world();
    const view = prepareObserverView(scene, CTX);
    const con = describeConstellation(scene, view, "CON:Ori");
    expect(con?.brightest).toEqual({ id: "HIP:1", title: "Rigel", mag: 0.5 });
  });

  it("returns null for an unknown constellation", () => {
    const { scene } = world();
    const view = prepareObserverView(scene, CTX);
    expect(describeConstellation(scene, view, "CON:Xyz")).toBeNull();
  });
});

describe("listConstellations", () => {
  it("sorts by name, ignoring case", () => {
    const { scene } = sceneOf(
      [
        { hip: 1, dir: dirAt(40, 90), mag: 1 },
        { hip: 2, dir: dirAt(41, 90), mag: 1 },
        { hip: 3, dir: dirAt(42, 90), mag: 1 },
        { hip: 4, dir: dirAt(43, 90), mag: 1 },
      ],
      [
        ["Ori", "orion", 1, 2],
        ["And", "Andromeda", 3, 4],
      ],
    );
    expect(listConstellations(scene).map((c) => c.id)).toEqual(["CON:And", "CON:Ori"]);
  });
});
