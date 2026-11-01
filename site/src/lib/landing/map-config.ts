/**
 * The map's one place for provider and policy values (ADR-0008). Changing the
 * tile provider is changing `TILE_URL_TEMPLATE`; nothing else names the host.
 * Policy: https://operations.osmfoundation.org/policies/tiles/
 *
 * Tiles load on demand only, once the visitor opens the map: no prefetching, no
 * seeding, no offline storage, and no `referrerPolicy` (the Referer is kept).
 */
export const TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
export const OSM_FIXTHEMAP_URL = "https://www.openstreetmap.org/fixthemap";

/** What the standard tile layer serves. */
export const TILE_MAX_ZOOM = 19;
export const MAP_MIN_ZOOM = 2;
/** The world at first sight, and how close a chosen place is shown. */
export const MAP_INITIAL_ZOOM = 4;
export const MAP_PLACE_ZOOM = 9;
