/**
 * The Explorer's state outside React: camera, layers, selection, gestures.
 * Frames are requested only on invalidation, and only selection changes reach
 * subscribers, so no React state moves per pointer event or per frame (FR-003).
 */

import {
  type ExplorerCamera,
  clampFov,
  projectToViewport,
  rotateByDrag,
  screenRay,
  zoomAnchored,
} from "../sky/camera.ts";
import { type ObservationContext, initialCamera } from "../sky/observer.ts";
import { multiply, normalize, fromUnitVectors, rotate } from "../sky/quat.ts";
import type { SkyScene } from "../sky/scene.ts";
import { type Vec3, normalizeVec } from "../sky/vec.ts";
import { type FramePlan, type Viewport, planFrame } from "./frame.ts";
import { DEFAULT_LAYERS, type PlanLayers } from "./layers.ts";
import { type ObserverView, prepareObserverView } from "./observerView.ts";
import { type Pick, pickAt } from "./pick.ts";

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

type Point = { x: number; y: number };

export class ExplorerController {
  readonly view: ObserverView;
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
    this.viewport = options.viewport;
    this.layers = options.layers ?? DEFAULT_LAYERS;
    this.camera = options.camera ?? initialCamera(options.ctx);
    this.view = prepareObserverView(options.scene, options.ctx);
    this.selection = this.known(options.selection ?? null) ? (options.selection ?? null) : null;
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

  /** Ask for one frame; any number of calls before it runs make a single request. */
  invalidate(): void {
    if (this.disposed || this.handle !== null) return;
    this.handle = this.requestFrame(this.runFrame);
  }

  dispose(): void {
    this.disposed = true;
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

  reset(): void {
    this.setCamera(initialCamera(this.ctx));
  }

  setLayer<K extends keyof PlanLayers>(key: K, value: PlanLayers[K]): void {
    if (this.layers[key] === value) return;
    this.layers = { ...this.layers, [key]: value };
    this.invalidate();
    this.touch();
  }

  /** Zoom about the centre by `steps` key presses; positive zooms in. */
  zoomBy(steps: number): void {
    const { width, height } = this.viewport;
    this.zoomTo(this.camera.fovDeg * Math.pow(KEY_ZOOM_FACTOR, -steps), width / 2, height / 2);
  }

  /** Turn the view to the star or the constellation's centre; the zoom stays. Instant. */
  centerOn(id: string): boolean {
    const star = this.starVector(id);
    const target = star ?? (this.scene.constellationIndexById.has(id) ? this.constellationCentre(id) : null);
    if (!target) return false;
    this.lookToward(target);
    return true;
  }

  pointerDown(id: number, x: number, y: number): void {
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
    const delta = Math.max(-WHEEL_MAX_DELTA, Math.min(WHEEL_MAX_DELTA, deltaY));
    this.zoomTo(this.camera.fovDeg * Math.exp(delta * WHEEL_SENSITIVITY), x, y);
  }

  /** True when the key was used, so the caller can stop the browser's own handling. */
  key(key: string): boolean {
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

  private lookToward(target: Vec3): void {
    const forward = rotate(this.camera.orientation, [0, 0, -1]);
    const delta = fromUnitVectors(forward, target);
    this.setCamera({ ...this.camera, orientation: normalize(multiply(delta, this.camera.orientation)) });
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
    // Never mid-gesture: the next change or the gesture's end starts the wait again.
    if (this.pointers.size > 0) {
      this.touch();
      return;
    }
    for (const listener of this.listeners) listener({ kind: "settled" });
  };

  private readonly runFrame = (): void => {
    this.handle = null;
    if (this.disposed) return;
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
      cardinalText: this.cardinalText,
    });
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
    this.last = { x: rest.x, y: rest.y };
    this.dragging = true;
  }

  private endGesture(): void {
    this.dragging = false;
    this.multi = false;
    this.pinchDistance = 0;
  }

  private pinchPoints(): { distance: number; centre: Point } {
    const [a, b] = [...this.pointers.values()];
    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  private beginPinch(): void {
    const { distance, centre } = this.pinchPoints();
    this.pinchDistance = distance;
    this.pinchCentre = centre;
  }

  private pinchStep(): void {
    const { distance, centre } = this.pinchPoints();
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
