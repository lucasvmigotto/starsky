/** What a selection id names, for marks and announcements. */

import { type HorizonStatus, type ObservationContext, horizonStatus } from "../sky/observer.ts";
import type { SceneStar, SkyScene } from "../sky/scene.ts";

export interface SelectionInfo {
  kind: "star" | "constellation";
  name: string;
  /** Only stars have one; a constellation spans the horizon. */
  horizon: HorizonStatus | null;
}

/** The star's proper name, else its catalogue designation. */
export function starLabel(star: SceneStar): string {
  return star.name ?? `HIP ${String(star.hip)}`;
}

export function describeSelection(
  scene: SkyScene,
  ctx: ObservationContext,
  id: string,
): SelectionInfo | null {
  const starIndex = scene.starIndexById.get(id);
  if (starIndex !== undefined) {
    const star = scene.stars[starIndex];
    const v = scene.vectors;
    return {
      kind: "star",
      name: starLabel(star),
      horizon: horizonStatus(ctx, [v[starIndex * 3] ?? 0, v[starIndex * 3 + 1] ?? 0, v[starIndex * 3 + 2] ?? 0]),
    };
  }
  const conIndex = scene.constellationIndexById.get(id);
  if (conIndex !== undefined) {
    return { kind: "constellation", name: scene.constellations[conIndex].name, horizon: null };
  }
  return null;
}
