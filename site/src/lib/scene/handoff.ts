/**
 * The hashes that move a scene between surfaces (012-poster-studio). Each one
 * is a plain `#...` string for the caller to navigate to; none of them rewrites
 * the link the visitor came from.
 */
import type { Locale } from "../../i18n/locale.ts";
import { type SharePayload, withPosterLocale } from "../share.ts";
import type { ExplorerCamera } from "../sky/camera.ts";
import { type ExplorerPayload, encodeExplorer } from "../sky/payload.ts";
import { draftHash } from "../studio/draft.ts";
import { explorerToPoster, posterToExplorer } from "./convert.ts";
import { loadReturnCamera, saveReturnCamera } from "./returnCamera.ts";

/**
 * Explorer -> Studio. Remembers where the camera was, for this tab and this
 * scene only, so "Return to Explorer" can put the visitor back.
 *
 * The draft's poster language is the one the `#e=` link carries, else the
 * visitor's interface language (018 US2): a pt-BR visitor's poster starts in
 * pt-BR, and the Studio can still change it.
 */
export function createPosterHash(
  explorer: ExplorerPayload,
  camera: ExplorerCamera,
  interfaceLocale: Locale,
): string {
  saveReturnCamera(explorer, camera);
  return draftHash(withPosterLocale(explorerToPoster(explorer), explorer.lang ?? interfaceLocale));
}

/** Studio -> Explorer: the same scene, at the camera left behind if this tab has it. */
export function returnToExplorerHash(poster: SharePayload): string {
  return `#e=${encodeExplorer(posterToExplorer(poster, loadReturnCamera(poster) ?? undefined))}`;
}

/** Viewer -> Explorer: the poster's place and moment, at the initial view. */
export function exploreHash(poster: SharePayload): string {
  return `#e=${encodeExplorer(posterToExplorer(poster))}`;
}

/** Viewer -> Studio: the shared poster itself as the draft. */
export function seedStudioHash(poster: SharePayload): string {
  return draftHash(poster);
}
