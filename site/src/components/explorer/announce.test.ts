import { describe, expect, it } from "bun:test";
import { CTX, dirAt, sceneOf } from "../../lib/explorer/fixture.ts";
import { announceSelection, cardinalText } from "./announce.ts";

describe("announceSelection", () => {
  const { scene } = sceneOf(
    [
      { hip: 32349, dir: dirAt(30, 0), mag: -1.4 },
      { hip: 7, dir: dirAt(-20, 100), mag: 4 },
      { hip: 8, dir: dirAt(10, 5), mag: 4 },
    ],
    [["CMa", "Canis Major", 32349, 8]],
    [[32349, "Sirius"]],
  );

  it("names the star and its side of the horizon", () => {
    expect(announceSelection(scene, CTX, "HIP:32349")).toBe("Sirius selected, above the horizon.");
    expect(announceSelection(scene, CTX, "HIP:7")).toBe("HIP 7 selected, below the horizon.");
  });

  it("never says visible", () => {
    for (const id of ["HIP:32349", "HIP:7", "CON:CMa"]) {
      expect(announceSelection(scene, CTX, id).toLowerCase()).not.toMatch(/visible|observable|can be seen/);
    }
  });

  it("names a constellation and announces a cleared selection", () => {
    expect(announceSelection(scene, CTX, "CON:CMa")).toBe("Canis Major constellation selected.");
    expect(announceSelection(scene, CTX, null)).toBe("Selection cleared.");
  });

  it("supplies the four cardinal letters from the catalogue", () => {
    expect(cardinalText()).toEqual(["N", "E", "S", "W"]);
  });
});
