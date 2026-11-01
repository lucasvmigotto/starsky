/** Layer flags the Explorer understands, with the defaults a link falls back to. */

import type { BelowMode, ExplorerLayers } from "../sky/payload.ts";

export interface PlanLayers {
  constellationLines: boolean;
  constellationLabels: boolean;
  horizon: boolean;
  cardinalDirections: boolean;
  equatorialGrid: boolean;
  below: BelowMode;
}

export const DEFAULT_LAYERS: PlanLayers = {
  constellationLines: true,
  constellationLabels: true,
  horizon: true,
  cardinalDirections: true,
  equatorialGrid: false,
  below: "dimmed",
};

const FLAGS = [
  "constellationLines",
  "constellationLabels",
  "horizon",
  "cardinalDirections",
  "equatorialGrid",
] as const;

/** Flags absent from the payload keep their defaults; unknown keys are ignored. */
export function layersFromPayload(layers: ExplorerLayers): PlanLayers {
  const out: PlanLayers = { ...DEFAULT_LAYERS };
  for (const key of FLAGS) {
    const value = layers[key];
    if (typeof value === "boolean") out[key] = value;
  }
  const below = layers["below"];
  if (below === "hidden" || below === "dimmed") out.below = below;
  return out;
}
