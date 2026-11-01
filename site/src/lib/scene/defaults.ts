/**
 * The poster's defaults: what the landing form starts with, and what the
 * Studio uses when a scene arrives from the Explorer with no composition.
 * One definition, so the two cannot drift.
 */
/** The place the landing starts at when the build sets none (owner's choice, 2026-11-01). */
export const FALLBACK_LOCATION = {
  lat: "-23.6914",
  lon: "-46.5647",
  place: "São Bernardo do Campo, SP, Brazil",
} as const;

/**
 * The default place, fixed at build time: `VITE_DEFAULT_PLACE`,
 * `VITE_DEFAULT_LAT` and `VITE_DEFAULT_LON`. All three or none; a half-set,
 * non-numeric or out-of-range trio is ignored whole, so a typo in a build
 * variable can never start the landing at a place nobody chose.
 */
export function resolveDefaultLocation(env: Readonly<Record<string, unknown>>): {
  lat: string;
  lon: string;
  place: string;
} {
  const place = env["VITE_DEFAULT_PLACE"];
  const lat = env["VITE_DEFAULT_LAT"];
  const lon = env["VITE_DEFAULT_LON"];
  if (typeof place !== "string" || typeof lat !== "string" || typeof lon !== "string") return FALLBACK_LOCATION;
  const la = Number(lat);
  const lo = Number(lon);
  const valid =
    place.trim() !== "" &&
    lat.trim() !== "" &&
    lon.trim() !== "" &&
    Number.isFinite(la) &&
    Number.isFinite(lo) &&
    Math.abs(la) <= 90 &&
    Math.abs(lo) <= 180;
  return valid ? { lat: lat.trim(), lon: lon.trim(), place: place.trim() } : FALLBACK_LOCATION;
}

/**
 * Vite fills `import.meta.env` in the app and in tests; the Playwright specs
 * import app modules under plain Node, where it does not exist. Typed
 * `unknown` so that case falls back instead of throwing at module load.
 */
const buildEnv: unknown = import.meta.env;
const LOCATION = resolveDefaultLocation(
  typeof buildEnv === "object" && buildEnv !== null ? (buildEnv as Readonly<Record<string, unknown>>) : {},
);

export const DEFAULTS = {
  mode: "place",
  lat: LOCATION.lat,
  lon: LOCATION.lon,
  place: LOCATION.place,
  when: "",
  tz: "UTC",
  projection: "stereographic",
  fisheyeStrength: 1.0,
  minSeparation: 0.008,
  magnitudeLimit: 5.8,
  glow: true,
  glowIntensity: 1.0,
  constellations: true,
  constellationLabels: true,
  shape: "circle",
  title: "",
} as const;
