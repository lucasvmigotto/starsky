import { describe, expect, it } from "bun:test";
import {
  conjugate,
  fromAxisAngle,
  fromBasis,
  fromUnitVectors,
  multiply,
  normalize,
  rotate,
  type Quat,
} from "./quat.ts";
import { angularDistanceDeg, raDecToVec, type Vec3 } from "./vec.ts";

const IDENTITY: Quat = [0, 0, 0, 1];

function close(a: Vec3, b: Vec3, digits = 10): void {
  for (let i = 0; i < 3; i += 1) {
    expect(a[i] ?? NaN).toBeCloseTo(b[i] ?? NaN, digits);
  }
}

describe("quat basics", () => {
  it("rotates 90 degrees about Z, counter-clockwise (Hamilton)", () => {
    const q = fromAxisAngle([0, 0, 1], 90);
    close(rotate(q, [1, 0, 0]), [0, 1, 0]);
  });

  it("conjugate inverts a unit rotation", () => {
    const q = fromAxisAngle([1, 2, 3], 37);
    close(rotate(conjugate(q), rotate(q, [0.3, -0.4, 0.5])), [0.3, -0.4, 0.5]);
  });

  it("multiply composes right to left", () => {
    const a = fromAxisAngle([0, 0, 1], 90);
    const b = fromAxisAngle([1, 0, 0], 90);
    // apply b first, then a
    close(rotate(multiply(a, b), [0, 1, 0]), rotate(a, rotate(b, [0, 1, 0])));
  });

  it("identity leaves vectors alone", () => {
    close(rotate(IDENTITY, [0.2, 0.3, 0.4]), [0.2, 0.3, 0.4]);
  });

  it("normalize returns unit length and falls back to identity for zero", () => {
    const n = normalize([0, 0, 0, 2]);
    expect(n).toEqual([0, 0, 0, 1]);
    expect(normalize([0, 0, 0, 0])).toEqual(IDENTITY);
  });
});

describe("fromUnitVectors", () => {
  it("maps a onto b by the shortest arc", () => {
    const pairs: [Vec3, Vec3][] = [
      [raDecToVec(0, 0), raDecToVec(10, 20)],
      [raDecToVec(200, -60), raDecToVec(210, -61)],
      [raDecToVec(0, 90), raDecToVec(0, 89.999)],
    ];
    for (const [a, b] of pairs) {
      close(rotate(fromUnitVectors(a, b), a), b, 9);
    }
  });

  it("handles identical and antiparallel vectors", () => {
    const a = raDecToVec(33, 44);
    expect(fromUnitVectors(a, a)).toEqual(IDENTITY);
    const flipped = raDecToVec(213, -44);
    const q = fromUnitVectors(a, flipped);
    close(rotate(q, a), flipped, 9);
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
  });
});

describe("fromBasis", () => {
  it("round-trips the basis columns", () => {
    const x: Vec3 = [0, -1, 0];
    const y: Vec3 = [0, 0, 1];
    const z: Vec3 = [-1, 0, 0];
    const q = fromBasis(x, y, z);
    close(rotate(q, [1, 0, 0]), x);
    close(rotate(q, [0, 1, 0]), y);
    close(rotate(q, [0, 0, 1]), z);
  });

  it("works for every trace branch", () => {
    const rots = [
      fromAxisAngle([1, 0, 0], 170),
      fromAxisAngle([0, 1, 0], 170),
      fromAxisAngle([0, 0, 1], 170),
      fromAxisAngle([1, 1, 1], 120),
    ];
    for (const r of rots) {
      const q = fromBasis(rotate(r, [1, 0, 0]), rotate(r, [0, 1, 0]), rotate(r, [0, 0, 1]));
      const v: Vec3 = [0.3, 0.5, -0.8];
      close(rotate(q, v), rotate(r, v), 9);
    }
  });
});

describe("normalization drift", () => {
  it("stays unit length after 10,000 compositions", () => {
    let q: Quat = IDENTITY;
    const step = fromAxisAngle([0.3, 0.5, 0.8], 0.7);
    for (let i = 0; i < 10_000; i += 1) q = normalize(multiply(step, q));
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
    const v = rotate(q, raDecToVec(10, 10));
    expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    expect(angularDistanceDeg(v, v)).toBe(0);
  });
});
