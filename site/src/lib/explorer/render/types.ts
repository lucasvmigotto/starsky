import type { FramePlan } from "../frame.ts";

/** CSS size of the canvas plus the device pixel ratio the backing store should honour. */
export interface RenderViewport {
  width: number;
  height: number;
  dpr: number;
}

/** A backend only draws a plan; a WebGL renderer would implement the same interface. */
export interface ExplorerRenderer {
  render(plan: FramePlan, viewport: RenderViewport): void;
  dispose(): void;
}
