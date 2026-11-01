import { describe, expect, it } from "bun:test";
import {
  conjugate,
  fromAxisAngle,
  fromBasis,
  fromUnitVectors,
  multiply,
  normalize,
  rotate,
  slerp,
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

describe("slerp", () => {
  const a = fromAxisAngle([0, 0, 1], 20);
  const b = fromAxisAngle([0, 0, 1], 100);

  function same(p: Quat, q: Quat, digits = 12): void {
    for (let i = 0; i < 4; i += 1) expect(p[i] ?? NaN).toBeCloseTo(q[i] ?? NaN, digits);
  }

  it("returns its endpoints at t = 0 and t = 1", () => {
    same(slerp(a, b, 0), a);
    same(slerp(a, b, 1), b);
  });

  it("turns half the angle at t = 0.5, staying a unit quaternion", () => {
    const mid = slerp(a, b, 0.5);
    same(mid, fromAxisAngle([0, 0, 1], 60));
    expect(Math.hypot(...mid)).toBeCloseTo(1, 12);
  });

  it("turns at a constant rate", () => {
    const q = slerp(a, b, 0.25);
    same(q, fromAxisAngle([0, 0, 1], 40));
  });

  it("takes the shortest path when the dot product is negative", () => {
    // -b is the same rotation as b; going to it must not sweep the long way round.
    const flipped: Quat = [-b[0], -b[1], -b[2], -b[3]];
    const mid = slerp(a, flipped, 0.5);
    // The same midpoint as to b, up to sign.
    const sign = mid[3] * fromAxisAngle([0, 0, 1], 60)[3] >= 0 ? 1 : -1;
    same([mid[0] * sign, mid[1] * sign, mid[2] * sign, mid[3] * sign], fromAxisAngle([0, 0, 1], 60));
    // And the end is the flipped quaternion's rotation, not a 260 degree detour.
    const end = slerp(a, flipped, 1);
    close3(rotate(end, [1, 0, 0]), rotate(b, [1, 0, 0]));
  });

  it("is stable for near-identical quaternions", () => {
    const c: Quat = normalize([1e-9, 0, 0, 1]);
    const r = slerp(IDENTITY, c, 0.5);
    expect(r.every((v) => Number.isFinite(v))).toBe(true);
    expect(Math.hypot(...r)).toBeCloseTo(1, 12);
    same(slerp(IDENTITY, IDENTITY, 0.3), IDENTITY);
  });

  it("does not modify its inputs", () => {
    const x: Quat = [...a];
    const y: Quat = [...b];
    slerp(x, y, 0.4);
    expect(x).toEqual(a);
    expect(y).toEqual(b);
  });
});

function close3(p: Vec3, q: Vec3): void {
  for (let i = 0; i < 3; i += 1) expect(p[i] ?? NaN).toBeCloseTo(q[i] ?? NaN, 10);
}
