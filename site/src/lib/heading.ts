import type { SharePayload } from "./share.ts";

type Translate = (
  key: string,
  args?: Readonly<Partial<Record<string, string | number>>>,
) => string;

/**
 * The Viewer's display heading. An explicit title wins; otherwise a known
 * place yields "Night sky above {place}"; otherwise the default.
 *
 * Display-only: the poster artifact (`captionLines`) still draws just the
 * detail line for untitled skies, so the same `#s=` link renders the same
 * file for everyone.
 */
export function displayHeadingTitle(payload: SharePayload, t: Translate): string {
  if (payload.options.title) return payload.options.title;
  if (payload.place) return t("viewer.heading.abovePlace", { place: payload.place });
  return t("viewer.heading.default");
}
