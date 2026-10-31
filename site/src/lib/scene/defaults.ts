/**
 * The poster's defaults: what the landing form starts with, and what the
 * Studio uses when a scene arrives from the Explorer with no composition.
 * One definition, so the two cannot drift.
 */
export const DEFAULTS = {
  mode: "place",
  lat: "40.7580",
  lon: "-73.9855",
  place: "Times Square, New York, NY",
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
