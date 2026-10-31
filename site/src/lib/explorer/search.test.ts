import { describe, expect, it } from "bun:test";
import { dirAt, sceneOf } from "./fixture.ts";
import { searchObjects } from "./search.ts";

const { scene } = sceneOf(
  [
    { hip: 32349, dir: dirAt(30, 10), mag: -1.46 },
    { hip: 11767, dir: dirAt(40, 20), mag: 2 },
    { hip: 3, dir: dirAt(41, 20), mag: 3 },
    { hip: 32350, dir: dirAt(42, 20), mag: 5 },
    { hip: 5, dir: dirAt(43, 20), mag: 9 },
    { hip: 6, dir: dirAt(50, 30), mag: 4 },
    { hip: 7, dir: dirAt(51, 30), mag: 4 },
  ],
  [
    ["CMa", "Canis Major", 32349, 3],
    ["UMi", "Ursa Minor", 11767, 32350],
    ["Cas", "Cassiopeia", 6, 7],
  ],
  [
    [32349, "Sirius"],
    [11767, "Polaris"],
    [6, "Schedar"],
    [7, "Béta Test"],
  ],
);

const ids = (q: string, opts?: { limit?: number; magLimit?: number }): string[] =>
  searchObjects(scene, q, opts).map((r) => r.id);

describe("searchObjects", () => {
  it("finds a constellation by name or abbreviation", () => {
    expect(ids("cassiopeia")).toEqual(["CON:Cas"]);
    expect(ids("UMi")).toEqual(["CON:UMi"]);
  });

  it("finds a star by name", () => {
    expect(ids("sirius")).toEqual(["HIP:32349"]);
  });

  it("finds a star by HIP number in the usual spellings", () => {
    expect(ids("11767")).toEqual(["HIP:11767"]);
    expect(ids("HIP 11767")).toEqual(["HIP:11767"]);
    expect(ids("hip:11767")).toEqual(["HIP:11767"]);
  });

  it("ranks exact before prefix before substring", () => {
    const { scene: s } = sceneOf(
      [
        { hip: 1, dir: dirAt(30, 10), mag: 1 },
        { hip: 2, dir: dirAt(31, 10), mag: 1 },
        { hip: 3, dir: dirAt(32, 10), mag: 1 },
      ],
      [],
      [
        [1, "Alpha Star"],
        [2, "Star"],
        [3, "Starlight"],
      ],
    );
    expect(searchObjects(s, "star").map((r) => r.id)).toEqual(["HIP:2", "HIP:3", "HIP:1"]);
  });

  it("ranks HIP numbers exact first, then by prefix", () => {
    expect(ids("323")).toEqual(["HIP:32349", "HIP:32350"]);
    expect(ids("32350")[0]).toBe("HIP:32350");
  });

  it("ignores diacritics and case in both directions", () => {
    expect(ids("beta")).toEqual(["HIP:7"]);
    expect(ids("BÉTA")).toEqual(["HIP:7"]);
  });

  it("returns nothing for an empty or blank query", () => {
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(ids("zzzz")).toEqual([]);
  });

  it("skips stars fainter than the magnitude limit", () => {
    expect(ids("5")).toContain("HIP:5");
    expect(ids("5", { magLimit: 6 })).not.toContain("HIP:5");
  });

  it("caps the number of results", () => {
    expect(ids("a", { limit: 2 })).toHaveLength(2);
  });

  it("describes each result for display", () => {
    const [first] = searchObjects(scene, "sirius");
    expect(first).toEqual({ id: "HIP:32349", kind: "star", label: "Sirius", hip: 32349, mag: -1.46 });
    const [con] = searchObjects(scene, "ursa");
    expect(con).toEqual({ id: "CON:UMi", kind: "constellation", label: "Ursa Minor", abbr: "UMi" });
  });

  it("is deterministic", () => {
    expect(ids("s")).toEqual(ids("s"));
  });
});
