/**
 * The Explorer's state outside React: camera, layers, selection, gestures.
 * Frames are requested only on invalidation, and only selection changes reach
 * subscribers, so no React state moves per pointer event or per frame (FR-003).
 */

import {
  type ExplorerCamera,
  FOV_MAX_DEG,
  FOV_MIN_DEG,
  clampFov,
  projectToViewport,
  rotateByDrag,
  screenRay,
  zoomAnchored,
} from "../sky/camera.ts";
import { type ObservationContext, initialCamera } from "../sky/observer.ts";
import { type Quat, multiply, normalize, fromUnitVectors, rotate, slerp } from "../sky/quat.ts";
import type { SkyScene } from "../sky/scene.ts";
import { type Vec3, normalizeVec } from "../sky/vec.ts";
import { type FramePlan, type LabelMark, type Viewport, planFrame } from "./frame.ts";
import { HoverStore } from "./hover.ts";
import { DEFAULT_LAYERS, type PlanLayers } from "./layers.ts";
import { type ObserverView, prepareObserverView } from "./observerView.ts";
import { type Pick, pickAt, pickConstellationAt } from "./pick.ts";

export type ControllerChange =
  | { kind: "selection"; selection: string | null }
  /** The view (camera, layers or selection) stopped changing; see `settleMs`. */
  | { kind: "settled" };

export interface FrameState {
  camera: ExplorerCamera;
  viewport: Viewport;
  frames: number;
}

export interface ControllerOptions {
  scene: SkyScene;
  ctx: ObservationContext;
  camera?: ExplorerCamera;
  layers?: PlanLayers;
  selection?: string | null;
  magLimit: number;
  viewport: Viewport;
  cardinalText?: readonly [string, string, string, string];
  /** `requestAnimationFrame` in the browser; a queue in tests. */
  requestFrame: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
  /**
   * Timers for the settled event. Without them the controller never settles,
   * which is what the pure tests want; the page passes the window's.
   */
  setTimer?: (callback: () => void, ms: number) => number;
  clearTimer?: (handle: number) => void;
  /** Quiet time before a change counts as settled; default 500. */
  settleMs?: number;
  /**
   * A millisecond clock, `performance.now` in the page. Without it the view
   * never animates and Reset view and Center on map jump, which is what the pure
   * tests want.
   */
  now?: () => number;
  /** True under `prefers-reduced-motion`: the animations are skipped. */
  reducedMotion?: () => boolean;
  draw: (plan: FramePlan, state: FrameState) => void;
}

/** Movement past this many CSS pixels turns a press into a drag. */
export const DRAG_THRESHOLD_PX = 4;
const WHEEL_SENSITIVITY = 0.0015;
const WHEEL_MAX_DELTA = 200;
const KEY_ZOOM_FACTOR = 1.25;
export const SETTLE_MS = 500;
/** One arrow press turns the view by this share of the shorter side. */
const KEY_ROTATE_SHARE = 0.1;
/** Reset view and Center on map take 300 ms for a short turn and 800 ms for half the sky. */
export const ANIMATION_MIN_MS = 300;
export const ANIMATION_MAX_MS = 800;
/** Distances below this many degrees are not worth animating. */
const ANIMATION_MIN_DISTANCE_DEG = 0.01;
const RAD_TO_DEG = 180 / Math.PI;

/** An eased move of the whole camera, advanced in the frame loop. */
interface Animation {
  fromQ: Quat;
  toQ: Quat;
  fromLogFov: number;
  toLogFov: number;
  toFov: number;
  start: number;
  duration: number;
}

/** Ease in-out, quadratic. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Point = { x: number; y: number };

export class ExplorerController {
  readonly view: ObserverView;
  /** The constellation under the pointer or the panel list's pointer (FR-013). Not a view change. */
  readonly hover = new HoverStore();
  /** Frames drawn so far; the e2e idle check reads it through the canvas. */
  frames = 0;

  private readonly scene: SkyScene;
  private readonly ctx: ObservationContext;
  private readonly magLimit: number;
  private readonly cardinalText: ControllerOptions["cardinalText"];
  private readonly requestFrame: ControllerOptions["requestFrame"];
  private readonly cancelFrame: ControllerOptions["cancelFrame"];
  private readonly draw: ControllerOptions["draw"];
  private readonly setTimer: ControllerOptions["setTimer"];
  private readonly clearTimer: ControllerOptions["clearTimer"];
  private readonly settleMs: number;
  private readonly now: ControllerOptions["now"];
  private readonly reducedMotion: ControllerOptions["reducedMotion"];
  private animation: Animation | null = null;
  /** The labels the last frame drew, so a hover can hit them; replaced, never copied. */
  private labels: readonly LabelMark[] = [];
  private settleHandle: number | null = null;
  private camera: ExplorerCamera;
  private layers: PlanLayers;
  private selection: string | null = null;
  private viewport: Viewport;
  private handle: number | null = null;
  private disposed = false;
  private readonly listeners = new Set<(change: ControllerChange) => void>();

  private readonly pointers = new Map<number, Point>();
  private start: Point = { x: 0, y: 0 };
  private last: Point = { x: 0, y: 0 };
  private dragging = false;
  private multi = false;
  private pinchDistance = 0;
  private pinchCentre: Point = { x: 0, y: 0 };

  constructor(options: ControllerOptions) {
    this.scene = options.scene;
    this.ctx = options.ctx;
    this.magLimit = options.magLimit;
    this.cardinalText = options.cardinalText;
    this.requestFrame = options.requestFrame;
    this.cancelFrame = options.cancelFrame;
    this.draw = options.draw;
    this.setTimer = options.setTimer;
    this.clearTimer = options.clearTimer;
    this.settleMs = options.settleMs ?? SETTLE_MS;
    this.now = options.now;
    this.reducedMotion = options.reducedMotion;
    this.viewport = options.viewport;
    this.layers = options.layers ?? DEFAULT_LAYERS;
    this.camera = options.camera ?? initialCamera(options.ctx);
    this.view = prepareObserverView(options.scene, options.ctx);
    this.selection = this.known(options.selection ?? null) ? (options.selection ?? null) : null;
    // A hover from either side is one frame, and neither touches the quiet period.
    this.hover.subscribe(() => {
      this.invalidate();
    });
    this.invalidate();
  }

  getCamera(): ExplorerCamera {
    return this.camera;
  }

  getSelection(): string | null {
    return this.selection;
  }

  getLayers(): PlanLayers {
    return this.layers;
  }

  subscribe(listener: (change: ControllerChange) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Hover the constellation whose figure or label is at this point (a mouse or
   * pen resting there). Asks for a frame only when the hovered id changes.
   */
  hoverAt(x: number, y: number): void {
    if (this.pointers.size > 0) {
      this.clearHover();
      return;
    }
    const id = pickConstellationAt(this.scene, this.view, this.camera, this.viewport, this.labels, x, y, {
      magLimit: this.magLimit,
      below: this.layers.below,
      lines: this.layers.constellationLines,
    });
    this.hover.set(id, "canvas");
  }

  /** Clear a hover the canvas set; one the panel's list set is the list's to clear. */
  clearHover(): void {
    if (this.hover.source === "canvas") this.hover.set(null, "canvas");
  }

  /** Ask for one frame; any number of calls before it runs make a single request. */
  invalidate(): void {
    if (this.disposed || this.handle !== null) return;
    this.handle = this.requestFrame(this.runFrame);
  }

  dispose(): void {
    this.disposed = true;
    this.animation = null;
    if (this.handle !== null) this.cancelFrame?.(this.handle);
    this.handle = null;
    if (this.settleHandle !== null) this.clearTimer?.(this.settleHandle);
    this.settleHandle = null;
    this.listeners.clear();
  }

  setViewport(width: number, height: number): void {
    if (width === this.viewport.width && height === this.viewport.height) return;
    this.viewport = { width, height };
    this.invalidate();
  }

  select(id: string | null): void {
    const next = this.known(id) ? id : null;
    if (next === this.selection) return;
    this.selection = next;
    this.invalidate();
    this.touch();
    for (const listener of this.listeners) listener({ kind: "selection", selection: next });
  }

  /** Back to the initial view, animated unless motion is reduced or no clock was given. */
  reset(): void {
    this.animateTo(initialCamera(this.ctx));
  }

  setLayer<K extends keyof PlanLayers>(key: K, value: PlanLayers[K]): void {
    if (this.layers[key] === value) return;
    this.layers = { ...this.layers, [key]: value };
    this.invalidate();
    this.touch();
  }

  /** Zoom about the centre by `steps` key presses; positive zooms in. */
  zoomBy(steps: number): void {
    this.cancelAnimation();
    const { width, height } = this.viewport;
    this.zoomTo(this.camera.fovDeg * Math.pow(KEY_ZOOM_FACTOR, -steps), width / 2, height / 2);
  }

  /** Turn the view to the star or the constellation's centre; the zoom stays. Animated like Reset view. */
  centerOn(id: string): boolean {
    const star = this.starVector(id);
    const target = star ?? (this.scene.constellationIndexById.has(id) ? this.constellationCentre(id) : null);
    if (!target) return false;
    this.lookToward(target, true);
    return true;
  }

  pointerDown(id: number, x: number, y: number): void {
    this.cancelAnimation();
    this.clearHover();
    if (this.pointers.size >= 2) return;
    this.pointers.set(id, { x, y });
    if (this.pointers.size === 1) {
      this.start = { x, y };
      this.last = { x, y };
      this.dragging = false;
      this.multi = false;
    } else {
      this.multi = true;
      this.beginPinch();
    }
  }

  pointerMove(id: number, x: number, y: number): void {
    const point = this.pointers.get(id);
    if (!point) return;
    point.x = x;
    point.y = y;
    if (this.pointers.size === 2) {
      this.pinchStep();
      return;
    }
    if (!this.dragging) {
      if (Math.hypot(x - this.start.x, y - this.start.y) <= DRAG_THRESHOLD_PX) return;
      // The grab point is where the press landed, so the sky does not jump.
      this.dragging = true;
      this.last = { ...this.start };
    }
    this.dragTo(x, y);
  }

  /** `select: false` ends a tap without picking: the page uses it when a tap only wakes the controls. */
  pointerUp(id: number, x: number, y: number, options: { select?: boolean } = {}): void {
    if (!this.pointers.has(id)) return;
    this.pointers.delete(id);
    if (this.pointers.size === 0) {
      const wasClick =
        !this.multi &&
        !this.dragging &&
        Math.hypot(x - this.start.x, y - this.start.y) <= DRAG_THRESHOLD_PX;
      this.endGesture();
      if (wasClick && options.select !== false) this.click(x, y);
      return;
    }
    this.continueAsDrag();
  }

  pointerCancel(id: number): void {
    this.pointers.delete(id);
    if (this.pointers.size === 0) this.endGesture();
    else this.continueAsDrag();
  }

  wheel(deltaY: number, x: number, y: number): void {
    this.cancelAnimation();
    const delta = Math.max(-WHEEL_MAX_DELTA, Math.min(WHEEL_MAX_DELTA, deltaY));
    this.zoomTo(this.camera.fovDeg * Math.exp(delta * WHEEL_SENSITIVITY), x, y);
  }

  /** True when the key was used, so the caller can stop the browser's own handling. */
  key(key: string): boolean {
    if (key !== "Escape") this.cancelAnimation();
    const { width, height } = this.viewport;
    const step = Math.min(width, height) * KEY_ROTATE_SHARE;
    const cx = width / 2;
    const cy = height / 2;
    switch (key) {
      case "ArrowLeft":
        return this.rotateKey(cx + step, cy);
      case "ArrowRight":
        return this.rotateKey(cx - step, cy);
      case "ArrowUp":
        return this.rotateKey(cx, cy + step);
      case "ArrowDown":
        return this.rotateKey(cx, cy - step);
      case "+":
      case "=":
        this.zoomTo(this.camera.fovDeg / KEY_ZOOM_FACTOR, cx, cy);
        return true;
      case "-":
      case "_":
        this.zoomTo(this.camera.fovDeg * KEY_ZOOM_FACTOR, cx, cy);
        return true;
      case "0":
        this.reset();
        return true;
      case "Escape":
        if (this.selection === null) return false;
        this.select(null);
        return true;
      default:
        return false;
    }
  }

  /**
   * The star under a point and where it is drawn, for the hover tooltip. Picks
   * on the data, asks for no frame and changes nothing.
   */
  starAt(x: number, y: number): { id: string; x: number; y: number } | null {
    const hit = pickAt(this.scene, this.view, this.camera, this.viewport, x, y, {
      magLimit: this.magLimit,
      below: this.layers.below,
      lines: false,
    });
    if (hit?.kind !== "star") return null;
    const vec = this.starVector(hit.id);
    const at = vec ? projectToViewport(this.camera, vec, this.viewport.width, this.viewport.height) : null;
    return at ? { id: hit.id, x: at.x, y: at.y } : null;
  }

  /** Centre on the star or constellation under the pointer, else on the point itself. */
  doubleClick(x: number, y: number): void {
    this.cancelAnimation();
    const { width, height } = this.viewport;
    const hit = this.pick(x, y);
    let target = screenRay(this.camera, x, y, width, height);
    if (hit?.kind === "star") {
      target = this.starVector(hit.id) ?? target;
    } else if (hit) {
      target = this.constellationCentre(hit.id) ?? target;
    }
    this.lookToward(target);
  }

  private lookToward(target: Vec3, animate = false): void {
    const forward = rotate(this.camera.orientation, [0, 0, -1]);
    const delta = fromUnitVectors(forward, target);
    const next = { ...this.camera, orientation: normalize(multiply(delta, this.camera.orientation)) };
    if (animate) this.animateTo(next);
    else this.setCamera(next);
  }

  /**
   * Move the camera to `target` over 300 to 800 ms, by quaternion slerp along
   * the shortest path and the field of view in log space, eased in and out. It
   * advances in the frame loop with the injected clock, and `settled` fires
   * once when it ends or is cancelled.
   */
  private animateTo(target: ExplorerCamera): void {
    const now = this.now;
    if (!now || this.reducedMotion?.() === true) {
      this.setCamera(target);
      return;
    }
    this.animation = null;
    const from = this.camera;
    const dot = Math.min(
      1,
      Math.abs(
        from.orientation[0] * target.orientation[0] +
          from.orientation[1] * target.orientation[1] +
          from.orientation[2] * target.orientation[2] +
          from.orientation[3] * target.orientation[3],
      ),
    );
    const turnDeg = 2 * Math.acos(dot) * RAD_TO_DEG;
    const fovShare = Math.abs(Math.log(target.fovDeg / from.fovDeg)) / Math.log(FOV_MAX_DEG / FOV_MIN_DEG);
    const distanceDeg = Math.max(turnDeg, fovShare * 180);
    if (distanceDeg < ANIMATION_MIN_DISTANCE_DEG) {
      this.setCamera(target);
      return;
    }
    this.animation = {
      fromQ: from.orientation,
      toQ: target.orientation,
      fromLogFov: Math.log(from.fovDeg),
      toLogFov: Math.log(target.fovDeg),
      toFov: target.fovDeg,
      start: now(),
      duration: ANIMATION_MIN_MS + (ANIMATION_MAX_MS - ANIMATION_MIN_MS) * Math.min(1, distanceDeg / 180),
    };
    this.invalidate();
  }

  /** Stop an animation where it is: the camera already holds the pose, and one settle follows. */
  private cancelAnimation(): void {
    if (this.animation === null) return;
    this.animation = null;
    this.touch();
  }

  /** One step of the animation, at the start of a frame. */
  private advanceAnimation(): void {
    const a = this.animation;
    const now = this.now;
    if (a === null || !now) return;
    const t = Math.min(1, Math.max(0, (now() - a.start) / a.duration));
    if (t >= 1) {
      this.animation = null;
      this.camera = { orientation: a.toQ, fovDeg: a.toFov };
      this.touch();
      return;
    }
    const e = easeInOut(t);
    this.camera = {
      orientation: slerp(a.fromQ, a.toQ, e),
      fovDeg: Math.exp(a.fromLogFov + (a.toLogFov - a.fromLogFov) * e),
    };
    this.invalidate();
  }

  private starVector(id: string): Vec3 | null {
    const index = this.scene.starIndexById.get(id);
    if (index === undefined) return null;
    const v = this.scene.vectors;
    return [v[index * 3] ?? 0, v[index * 3 + 1] ?? 0, v[index * 3 + 2] ?? 0];
  }

  /** A change happened: (re)start the quiet period that ends in `settled`. */
  private touch(): void {
    if (this.disposed || !this.setTimer) return;
    if (this.settleHandle !== null) this.clearTimer?.(this.settleHandle);
    this.settleHandle = this.setTimer(this.onSettle, this.settleMs);
  }

  private readonly onSettle = (): void => {
    this.settleHandle = null;
    if (this.disposed) return;
    // Never mid-gesture or mid-animation: the end starts the wait again.
    if (this.pointers.size > 0 || this.animation !== null) {
      this.touch();
      return;
    }
    for (const listener of this.listeners) listener({ kind: "settled" });
  };

  private readonly runFrame = (): void => {
    this.handle = null;
    if (this.disposed) return;
    this.advanceAnimation();
    this.frames++;
    const plan = planFrame({
      scene: this.scene,
      view: this.view,
      camera: this.camera,
      viewport: this.viewport,
      layers: this.layers,
      magLimit: this.magLimit,
      selection: this.selection,
      hover: null,
      hoverConstellation: this.hover.id,
      cardinalText: this.cardinalText,
    });
    this.labels = plan.labels;
    this.draw(plan, { camera: this.camera, viewport: this.viewport, frames: this.frames });
  };

  private known(id: string | null): boolean {
    if (id === null) return false;
    return this.scene.starIndexById.has(id) || this.scene.constellationIndexById.has(id);
  }

  private pick(x: number, y: number): Pick | null {
    return pickAt(this.scene, this.view, this.camera, this.viewport, x, y, {
      magLimit: this.magLimit,
      below: this.layers.below,
      lines: this.layers.constellationLines,
    });
  }

  private click(x: number, y: number): void {
    this.select(this.pick(x, y)?.id ?? null);
  }

  private constellationCentre(id: string): Vec3 | null {
    const index = this.scene.constellationIndexById.get(id);
    const con = index === undefined ? undefined : this.scene.constellations[index];
    if (!con) return null;
    const sum: Vec3 = [0, 0, 0];
    for (const i of con.memberIndices) {
      sum[0] += this.scene.vectors[i * 3] ?? 0;
      sum[1] += this.scene.vectors[i * 3 + 1] ?? 0;
      sum[2] += this.scene.vectors[i * 3 + 2] ?? 0;
    }
    const centre = normalizeVec(sum);
    return centre[0] === 0 && centre[1] === 0 && centre[2] === 0 ? null : centre;
  }

  private setCamera(camera: ExplorerCamera): void {
    this.animation = null;
    this.camera = camera;
    this.invalidate();
    this.touch();
  }

  private dragTo(x: number, y: number): void {
    const { width, height } = this.viewport;
    this.setCamera(rotateByDrag(this.camera, this.last, { x, y }, width, height));
    this.last = { x, y };
  }

  private rotateKey(toX: number, toY: number): boolean {
    const { width, height } = this.viewport;
    this.setCamera(
      rotateByDrag(this.camera, { x: width / 2, y: height / 2 }, { x: toX, y: toY }, width, height),
    );
    return true;
  }

  private zoomTo(fovDeg: number, x: number, y: number): void {
    if (clampFov(fovDeg) === this.camera.fovDeg) return;
    const { width, height } = this.viewport;
    this.setCamera(zoomAnchored(this.camera, fovDeg, x, y, width, height));
  }

  /** A pinch lost a finger: the other carries on as a drag, never a click. */
  private continueAsDrag(): void {
    const [rest] = [...this.pointers.values()];
    if (!rest) return;
    this.last = { x: rest.x, y: rest.y };
    this.dragging = true;
  }

  private endGesture(): void {
    this.dragging = false;
    this.multi = false;
    this.pinchDistance = 0;
  }

  /** The two fingers' distance and midpoint; null unless exactly two are down. */
  private pinchPoints(): { distance: number; centre: Point } | null {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return null;
    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  private beginPinch(): void {
    const points = this.pinchPoints();
    if (!points) return;
    const { distance, centre } = points;
    this.pinchDistance = distance;
    this.pinchCentre = centre;
  }

  private pinchStep(): void {
    const points = this.pinchPoints();
    if (!points) return;
    const { distance, centre } = points;
    if (this.pinchDistance > 0 && distance > 0) {
      const { width, height } = this.viewport;
      let camera = this.camera;
      const fov = camera.fovDeg * (this.pinchDistance / distance);
      if (clampFov(fov) !== camera.fovDeg) {
        camera = zoomAnchored(camera, fov, this.pinchCentre.x, this.pinchCentre.y, width, height);
      }
      camera = rotateByDrag(camera, this.pinchCentre, centre, width, height);
      this.setCamera(camera);
    }
    this.pinchDistance = distance;
    this.pinchCentre = centre;
  }
}
