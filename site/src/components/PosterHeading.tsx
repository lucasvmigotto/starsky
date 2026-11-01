/**
 * The poster's title and moment (date, time and timezone) as text, above its sky image. The Viewer and
 * the Studio show the same two lines, so the page never repeats the exported
 * caption band (BCR-0013).
 */
import type { JSX } from "react";
import { t } from "../i18n/index.ts";
import { formatLocalTime } from "../lib/caption.ts";
import { displayHeadingTitle } from "../lib/heading.ts";
import type { SharePayload } from "../lib/share.ts";

export default function PosterHeading({ payload }: { payload: SharePayload }): JSX.Element {
  return (
    <div className="atlas-moment">
      <p className="font-display text-3xl leading-tight sm:text-4xl">{displayHeadingTitle(payload, t)}</p>
      <p className="mt-2 text-sm text-text-muted">{formatLocalTime(payload.when_utc, payload.tz)}</p>
    </div>
  );
}
