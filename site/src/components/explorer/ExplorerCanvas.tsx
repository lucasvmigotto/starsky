/**
 * The Explorer's canvas. React owns the element and the live region; the
 * controller owns everything that moves, so nothing here re-renders per pointer
 * event or per frame (FR-003). Only a selection change reaches React state.
 */
import { useEffect, useRef, useState } from "react";
import type { JSX, RefObject } from "react";
import { t } from "../../i18n/index.ts";
import { ExplorerController } from "../../lib/explorer/controller.ts";
import { layersFromPayload } from "../../lib/explorer/layers.ts";
import { Canvas2dRenderer } from "../../lib/explorer/render/canvas2d.ts";
import type { ObservationContext } from "../../lib/sky/observer.ts";
import type { ExplorerPayload } from "../../lib/sky/payload.ts";
import type { SkyScene } from "../../lib/sky/scene.ts";
import { announceSelection, cardinalText } from "./announce.ts";

interface Props {
  scene: SkyScene;
  payload: ExplorerPayload;
  /** Told once when the controller exists, and with null when it is gone. */
  onController?: (controller: ExplorerController | null) => void;
  /** So the page can return focus to the map. */
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

const HINT_ID = "explorer-canvas-hint";
/** Wheel `deltaMode` 1 is lines; scale to roughly pixels. */
const LINE_HEIGHT_PX = 16;

export default function ExplorerCanvas({ scene, payload, onController, canvasRef: external }: Props): JSX.Element {
  const own = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = external ?? own;
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx: ObservationContext = {
      latDeg: payload.lat,
      lonDeg: payload.lon,
      when: new Date(payload.when_utc),
    };
    const renderer = new Canvas2dRenderer(canvas);
    const rect = canvas.getBoundingClientRect();
    const controller = new ExplorerController({
      scene,
      ctx,
      camera: { orientation: payload.q, fovDeg: payload.fov },
      layers: layersFromPayload(payload.layers),
      selection: payload.sel,
      magLimit: payload.mag,
      viewport: { width: rect.width, height: rect.height },
      cardinalText: cardinalText(),
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => {
        window.cancelAnimationFrame(handle);
      },
      setTimer: (callback, ms) => window.setTimeout(callback, ms),
      clearTimer: (handle) => {
        window.clearTimeout(handle);
      },
      draw: (plan, state) => {
        renderer.render(plan, { ...state.viewport, dpr: window.devicePixelRatio });
        // Read by the e2e idle and pole checks, not by product code.
        canvas.dataset["frames"] = String(state.frames);
        canvas.dataset["fov"] = state.camera.fovDeg.toFixed(3);
      },
    });

    const local = (event: { clientX: number; clientY: number }): { x: number; y: number } => {
      const r = canvas.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };
    const onPointerDown = (e: PointerEvent): void => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const p = local(e);
      controller.pointerDown(e.pointerId, p.x, p.y);
    };
    const onPointerMove = (e: PointerEvent): void => {
      const p = local(e);
      controller.pointerMove(e.pointerId, p.x, p.y);
    };
    const onPointerUp = (e: PointerEvent): void => {
      const p = local(e);
      controller.pointerUp(e.pointerId, p.x, p.y);
    };
    const onPointerCancel = (e: PointerEvent): void => {
      controller.pointerCancel(e.pointerId);
    };
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const p = local(e);
      controller.wheel(e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT_PX : e.deltaY, p.x, p.y);
    };
    const onDoubleClick = (e: MouseEvent): void => {
      const p = local(e);
      controller.doubleClick(p.x, p.y);
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (controller.key(e.key)) e.preventDefault();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("lostpointercapture", onPointerCancel);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("keydown", onKeyDown);

    const observer = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      controller.setViewport(box.width, box.height);
    });
    observer.observe(canvas);

    const unsubscribe = controller.subscribe((change) => {
      if (change.kind !== "selection") return;
      setAnnouncement(announceSelection(scene, ctx, change.selection));
    });
    setAnnouncement(t("explorer.announced.ready"));
    onController?.(controller);

    return () => {
      onController?.(null);
      unsubscribe();
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("lostpointercapture", onPointerCancel);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("keydown", onKeyDown);
      controller.dispose();
      renderer.dispose();
    };
    // `onController` and the ref are stable for the life of the page.
  }, [scene, payload]);

  const label =
    payload.place === null
      ? t("explorer.canvasLabel.untitled")
      : t("explorer.canvasLabel", { place: payload.place });

  return (
    <>
      <canvas
        ref={canvasRef}
        className="explorer-canvas"
        role="img"
        aria-label={label}
        aria-describedby={HINT_ID}
        tabIndex={0}
      />
      <p id={HINT_ID} className="sr-only">
        {t("explorer.canvasHint")}
      </p>
      <p role="status" aria-label={t("explorer.announced.label")} className="sr-only">
        {announcement}
      </p>
    </>
  );
}
