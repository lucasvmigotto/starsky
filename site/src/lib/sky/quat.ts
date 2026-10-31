/** Unit quaternion [x, y, z, w], Hamilton product; rotates camera to world (ADR-0006). */

import { cross, dot, normalizeVec, type Vec3 } from "./vec.ts";

export type Quat = [number, number, number, number];

const DEG = Math.PI / 180;

export function normalize(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

/** Hamilton product a * b: apply b first, then a. */
export function multiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function conjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

/** v' = q v q*, via v + w t + u x t with t = 2 (u x v). */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]];
  const t = cross(u, v);
  t[0] *= 2;
  t[1] *= 2;
  t[2] *= 2;
  const ut = cross(u, t);
  return [
    v[0] + q[3] * t[0] + ut[0],
    v[1] + q[3] * t[1] + ut[1],
    v[2] + q[3] * t[2] + ut[2],
  ];
}

export function fromAxisAngle(axis: Vec3, angleDeg: number): Quat {
  const a = normalizeVec(axis);
  const half = (angleDeg * DEG) / 2;
  const s = Math.sin(half);
  return [a[0] * s, a[1] * s, a[2] * s, Math.cos(half)];
}

/** Shortest-arc rotation taking unit vector `a` onto unit vector `b`. */
export function fromUnitVectors(a: Vec3, b: Vec3): Quat {
  const d = dot(a, b);
  if (d > 1 - 1e-15) {
    const c = cross(a, b);
    // Nearly identical: first-order correction keeps tiny drags exact.
    return normalize([c[0] / 2, c[1] / 2, c[2] / 2, 1]);
  }
  if (d < -1 + 1e-12) {
    // Antiparallel: any axis perpendicular to a.
    const helper: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const axis = normalizeVec(cross(a, helper));
    return [axis[0], axis[1], axis[2], 0];
  }
  const c = cross(a, b);
  return normalize([c[0], c[1], c[2], 1 + d]);
}

/** Rotation whose columns are the images of the X, Y and Z axes (a right-handed basis). */
export function fromBasis(x: Vec3, y: Vec3, z: Vec3): Quat {
  const m00 = x[0];
  const m10 = x[1];
  const m20 = x[2];
  const m01 = y[0];
  const m11 = y[1];
  const m21 = y[2];
  const m02 = z[0];
  const m12 = z[1];
  const m22 = z[2];
  const trace = m00 + m11 + m22;
  let q: Quat;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  return normalize(q);
}
