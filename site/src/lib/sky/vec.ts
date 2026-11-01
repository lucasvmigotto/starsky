/** Equatorial unit vectors (ADR-0006): +X at RA 0 Dec 0, +Y at RA 90, +Z at the north pole. */

export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;

export function raDecToVec(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)];
}

export function vecToRaDec(v: Vec3): { raDeg: number; decDeg: number } {
  const len = Math.hypot(v[0], v[1], v[2]);
  const decDeg = Math.asin(Math.max(-1, Math.min(1, v[2] / (len || 1)))) / DEG;
  let raDeg = Math.atan2(v[1], v[0]) / DEG;
  if (raDeg < 0) raDeg += 360;
  // atan2 can return -0 or tiny negatives that round up to 360.
  if (raDeg >= 360) raDeg = 0;
  return { raDeg, decDeg };
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function normalizeVec(a: Vec3): Vec3 {
  const len = Math.hypot(a[0], a[1], a[2]);
  return len === 0 ? [0, 0, 0] : scale(a, 1 / len);
}

/** atan2 of |a x b| and a . b stays accurate for tiny and near-antipodal angles. */
export function angularDistanceDeg(a: Vec3, b: Vec3): number {
  const c = cross(a, b);
  return Math.atan2(Math.hypot(c[0], c[1], c[2]), dot(a, b)) / DEG;
}

/** Great-circle interpolation between unit vectors. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  if (t === 0) return a;
  const omega = Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));
  const sinO = Math.sin(omega);
  if (sinO < 1e-12) return normalizeVec(add(scale(a, 1 - t), scale(b, t)));
  return add(scale(a, Math.sin((1 - t) * omega) / sinO), scale(b, Math.sin(t * omega) / sinO));
}
