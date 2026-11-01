import { describe, expect, it } from "bun:test";
import { CTX, dirAt, sceneOf } from "./fixture.ts";
import { describeSelection } from "./selection.ts";

describe("describeSelection", () => {
  const { scene } = sceneOf(
    [
      { hip: 32349, dir: dirAt(30, 0), mag: -1.4 },
      { hip: 7, dir: dirAt(-20, 100), mag: 4 },
      { hip: 8, dir: dirAt(10, 5), mag: 4 },
    ],
    [["Tst", "Testudo", 32349, 8]],
    [[32349, "Sirius"]],
  );

  it("names a star and says which side of the horizon it is on", () => {
    expect(describeSelection(scene, CTX, "HIP:32349")).toEqual({ kind: "star", name: "Sirius", horizon: "above" });
    expect(describeSelection(scene, CTX, "HIP:7")).toEqual({ kind: "star", name: "HIP 7", horizon: "below" });
  });

  it("names a constellation without claiming a horizon status", () => {
    expect(describeSelection(scene, CTX, "CON:Tst")).toEqual({ kind: "constellation", name: "Testudo", horizon: null });
  });

  it("returns null for ids it does not know", () => {
    expect(describeSelection(scene, CTX, "HIP:1")).toBeNull();
    expect(describeSelection(scene, CTX, "nonsense")).toBeNull();
  });
});
