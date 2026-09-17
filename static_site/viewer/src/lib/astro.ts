/** Compact sidereal alt/az math. Poster-grade (arcminute errors invisible). */

const DEG = Math.PI / 180;

export function norm360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

export function julianDate(when: Date): number {
  return when.getTime() / 86_400_000 + 2_440_587.5;
}

/** Greenwich mean sidereal time, degrees. */
export function gmstDegrees(when: Date): number {
  const jd = julianDate(when);
  const t = (jd - 2_451_545.0) / 36_525;
  return norm360(
    280.46061837 +
      360.98564736629 * (jd - 2_451_545) +
      0.000387933 * t * t -
      (t * t * t) / 38_710_000,
  );
}

export interface AltAz {
  altDeg: number;
  azDeg: number;
}

/** Altitude/azimuth (az eastward from north) for an equatorial position. */
export function altAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  when: Date,
): AltAz {
  const lst = norm360(gmstDegrees(when) + lonDeg);
  const h = norm360(lst - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const east = -Math.cos(dec) * Math.sin(h);
  const north =
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(h);
  return { altDeg: alt / DEG, azDeg: norm360(Math.atan2(east, north) / DEG) };
}

export interface Projected {
  x: number;
  y: number;
  r: number;
}

/**
 * Stereographic (conformal, default): r = cos(alt) / (1 + sin(alt)),
 * north-up with x = r·sin(az), y = −r·cos(az). Zenith maps to 0,
 * horizon to 1. Matches render-spec.json.
 */
export function projectStereographic(altDeg: number, azDeg: number): Projected {
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const r = Math.cos(alt) / (1 + Math.sin(alt));
  return { x: r * Math.sin(az), y: -r * Math.cos(az), r };
}

/**
 * Fisheye: r = ((90 − alt) / 90) ** strength, same angular mapping
 * as stereographic. Matches render-spec.json.
 */
export function projectFisheye(
  altDeg: number,
  azDeg: number,
  strength: number,
): Projected {
  const az = azDeg * DEG;
  const r = ((90 - altDeg) / 90) ** strength;
  return { x: r * Math.sin(az), y: -r * Math.cos(az), r };
}

export function project(
  kind: "stereographic" | "fisheye",
  altDeg: number,
  azDeg: number,
  strength: number,
): Projected {
  return kind === "fisheye"
    ? projectFisheye(altDeg, azDeg, strength)
    : projectStereographic(altDeg, azDeg);
}
