/** Selection announcements for the Explorer's one live region. */

import { t } from "../../i18n/index.ts";
import { describeSelection } from "../../lib/explorer/selection.ts";
import type { ObservationContext } from "../../lib/sky/observer.ts";
import type { SkyScene } from "../../lib/sky/scene.ts";

/** Says where a star is relative to the horizon, and never that it can be seen. */
export function announceSelection(
  scene: SkyScene,
  ctx: ObservationContext,
  selection: string | null,
): string {
  const info = selection === null ? null : describeSelection(scene, ctx, selection);
  if (!info) return t("explorer.announced.cleared");
  if (info.kind === "constellation") return t("explorer.announced.constellation", { name: info.name });
  return t(info.horizon === "below" ? "explorer.announced.starBelow" : "explorer.announced.starAbove", {
    name: info.name,
  });
}

export function cardinalText(): readonly [string, string, string, string] {
  return [
    t("explorer.cardinal.n"),
    t("explorer.cardinal.e"),
    t("explorer.cardinal.s"),
    t("explorer.cardinal.w"),
  ];
}
