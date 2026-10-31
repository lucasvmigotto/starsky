/**
 * The link that follows the view: the `#e=` payload rebuilt from the
 * controller's durable state (camera, layers, selection) on top of the moment
 * the page was opened with. Never pointer, hover or panel state.
 */

import type { ExplorerCamera } from "../sky/camera.ts";
import { type ExplorerLayers, type ExplorerPayload, encodeExplorer } from "../sky/payload.ts";
import type { ExplorerController } from "./controller.ts";
import type { PlanLayers } from "./layers.ts";

export interface ViewState {
  camera: ExplorerCamera;
  layers: PlanLayers;
  selection: string | null;
}

export function layersToPayload(layers: PlanLayers): ExplorerLayers {
  return {
    constellationLines: layers.constellationLines,
    constellationLabels: layers.constellationLabels,
    horizon: layers.horizon,
    cardinalDirections: layers.cardinalDirections,
    equatorialGrid: layers.equatorialGrid,
    below: layers.below,
  };
}

export function payloadFromState(base: ExplorerPayload, state: ViewState): ExplorerPayload {
  return {
    ...base,
    q: state.camera.orientation,
    fov: state.camera.fovDeg,
    layers: layersToPayload(state.layers),
    sel: state.selection,
  };
}

/** `#e=<fragment>` for the state. */
export function linkHash(base: ExplorerPayload, state: ViewState): string {
  return `#e=${encodeExplorer(payloadFromState(base, state))}`;
}

export function absoluteLink(
  hash: string,
  location: Pick<Location, "origin" | "pathname" | "search">,
): string {
  return `${location.origin}${location.pathname}${location.search}${hash}`;
}

function stateOf(controller: ExplorerController): ViewState {
  return {
    camera: controller.getCamera(),
    layers: controller.getLayers(),
    selection: controller.getSelection(),
  };
}

/** The link for what the controller shows right now. */
export function currentHash(controller: ExplorerController, base: ExplorerPayload): string {
  return linkHash(base, stateOf(controller));
}

/**
 * Write the link each time the controller settles (it waits out the debounce and
 * any gesture), skipping a link equal to the last one written.
 */
export function bindLink(
  controller: ExplorerController,
  base: ExplorerPayload,
  write: (hash: string) => void,
): () => void {
  let last: string | null = null;
  return controller.subscribe((change) => {
    if (change.kind !== "settled") return;
    const hash = currentHash(controller, base);
    if (hash === last) return;
    last = hash;
    write(hash);
  });
}
