/**
 * The sky image — the poster renderer, static.
 *
 * The poster is composed once into an offscreen canvas and the visible one
 * shows its square sky region. The page shows the sky image only (BCR-0013):
 * the caption band the exports carry is never on the page, and the image
 * neither zooms nor pans. Exploring is the Explorer's job ("Explore this sky").
 */
import { useEffect, useMemo, useState } from "react";
import { t } from "../i18n/index.ts";
import { formatDetailLine } from "../lib/caption.ts";
import { renderPoster } from "../lib/render/poster.ts";
import type { SharePayload } from "../lib/share.ts";
import {
  CANVAS_H,
  CANVAS_W,
  DISK_CX,
  DISK_CY,
  DISK_R,
  SKY_H,
  type SkyModel,
} from "../lib/skymodel.ts";

const PREVIEW = { diskCx: DISK_CX, diskCy: DISK_CY, diskR: DISK_R };

interface Props {
  payload: SharePayload;
  model: SkyModel;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Redraw once the webfont has settled so the caption uses the real face. */
  fontsReady: boolean;
}

export default function SkyCanvas({ payload, model, canvasRef, fontsReady }: Props) {
  /**
   * Device pixels per CSS pixel, capped like the composition.
   *
   * State rather than a fresh `window.devicePixelRatio` read, because browser
   * zoom changes the ratio *without* reloading — and a poster composed for the
   * old ratio is then blitted under the new one. The listener below makes
   * zooming the browser re-render the image instead of breaking it until the
   * next reload.
   */
  const [dpr, setDpr] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(3, window.devicePixelRatio || 1),
  );

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const resubscribe = () => {
      setDpr(Math.min(3, window.devicePixelRatio || 1));
      mq?.removeEventListener("change", resubscribe);
      // A query on the *current* ratio fires exactly when the ratio stops
      // being current, so re-subscribing on every fire tracks zoom in both
      // directions with no polling.
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio.toString()}dppx)`);
      mq.addEventListener("change", resubscribe);
    };
    resubscribe();
    return () => {
      mq?.removeEventListener("change", resubscribe);
    };
  }, []);

  /**
   * The caption as plain text, for the screen-reader copy (T036).
   *
   * Built from the same `formatDetailLine` the poster renders with, so the
   * spoken caption and the drawn one cannot disagree — the UI and the artifact
   * showing different coordinates is exactly what vision principle 4 forbids.
   */
  const caption = formatDetailLine(
    payload.lat,
    payload.lon,
    payload.place,
    payload.when_utc,
    payload.tz,
  );

  const poster = useMemo(() => {
    if (typeof document === "undefined") return null;
    const offscreen = document.createElement("canvas");
    offscreen.width = Math.round(CANVAS_W * dpr);
    offscreen.height = Math.round(CANVAS_H * dpr);
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    renderPoster(ctx, payload, model, CANVAS_W, dpr, PREVIEW);
    return offscreen;
    // `fontsReady` is a dependency so the composition re-runs with the real
    // face once the webfont has loaded; `dpr` so a browser-zoom change
    // recomposes instead of blitting stale pixels until the next reload.
  }, [payload, model, fontsReady, dpr]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !poster) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // The visible canvas is the sky region only: the composition's top
    // `SKY_H` of `CANVAS_H` rows, in device pixels. The source rect is in
    // device pixels too; a logical one would crop the top-left 1/dpr of the
    // poster anywhere but at dpr 1.
    const skyRows = Math.round((poster.height * SKY_H) / CANVAS_H);
    canvas.width = poster.width;
    canvas.height = skyRows;
    ctx.drawImage(poster, 0, 0, poster.width, skyRows, 0, 0, poster.width, skyRows);
  }, [canvasRef, poster]);

  return (
    <div className="atlas-sky">
      <canvas
        ref={canvasRef}
        className="atlas-sky-canvas"
        role="img"
        /*
          The caption is exposed as *text* below, not only in this label
          (000-design-system T036, DS-A11Y-006). An `aria-label` replaces the
          element's content, so a caption rendered inside the figure would be
          invisible to a screen reader; keeping it as sibling text is what makes
          the image's own words reachable.
        */
        aria-label={
          payload.options.title
            ? t("viewer.canvasLabel", { title: payload.options.title })
            : t("viewer.canvasLabel.untitled")
        }
      />
      {/*
        The caption as text (T036). Visually hidden because the poster already
        draws it in the exports, but a screen reader gets the coordinates, the
        place and the moment as words — the only way the image's identity is
        legible to anyone who cannot see it.
      */}
      <span className="sr-only">{caption}</span>
    </div>
  );
}
