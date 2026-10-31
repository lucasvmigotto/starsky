/**
 * The `#studio=` draft: the same payload, codec and validation as `#s=`, under
 * its own prefix (vision D13). A draft is never a share link; copying a link
 * from the Studio re-encodes it under `#s=`.
 */
import { encodePayload } from "../encode.ts";
import { stripUnsupported, unsupportedInPosterFont } from "../render/glyphs.ts";
import { type SharePayload, decodeShareFragment } from "../share.ts";

const PREFIX = "studio=";

/** The fragment after `#studio=`, or null for anything else (including empty). */
export function studioFragmentFromHash(hash: string): string | null {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!body.startsWith(PREFIX)) return null;
  const fragment = body.slice(PREFIX.length);
  return fragment === "" ? null : fragment;
}

export function encodeDraft(payload: SharePayload): string {
  return encodePayload(payload);
}

/** Throws `ShareDecodeError` or `ShareVersionError`, exactly as `#s=` does. */
export function decodeDraft(fragment: string): SharePayload {
  return decodeShareFragment(fragment);
}

export function draftHash(payload: SharePayload): string {
  return `#${PREFIX}${encodeDraft(payload)}`;
}

/**
 * A draft seeded from somebody else's link, or from the Explorer, can carry a
 * title or place the poster face cannot draw. As in the Viewer, the characters
 * are dropped so the preview and every export agree, and the caller says so.
 * (What the visitor types in the Studio is refused instead: they can fix it.)
 */
export function adjustUndrawable(payload: SharePayload): {
  payload: SharePayload;
  removed: string[];
} {
  const title = payload.options.title;
  const place = payload.place;
  const nextTitle = stripUnsupported(title ?? "");
  const nextPlace = stripUnsupported(place ?? "");
  if (nextTitle === null && nextPlace === null) return { payload, removed: [] };
  return {
    payload: {
      ...payload,
      place: nextPlace === null ? place : nextPlace || null,
      options: {
        ...payload.options,
        title: nextTitle === null ? title : nextTitle || null,
      },
    },
    removed: [...unsupportedInPosterFont(title ?? ""), ...unsupportedInPosterFont(place ?? "")],
  };
}
