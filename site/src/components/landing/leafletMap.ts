/**
 * The Leaflet map, and the only module that imports Leaflet. The landing loads
 * it with a dynamic `import()` once the visitor opens the map, so neither the
 * library nor its CSS and marker images are in the main chunk (FR-001). All of
 * it is bundled locally; nothing comes from a CDN.
 *
 * Tiles follow ADR-0008: the URL is `TILE_URL_TEMPLATE`, requested only for
 * what the visitor looks at. This file sets no referrer policy, prefetches
 * nothing and stores no tiles.
 */
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import {
  MAP_INITIAL_ZOOM,
  MAP_MIN_ZOOM,
  MAP_PLACE_ZOOM,
  TILE_MAX_ZOOM,
  TILE_URL_TEMPLATE,
} from "../../lib/landing/map-config.ts";
import type { MapFocus, MapHandle, MapOptions } from "./mapTypes.ts";

// Leaflet derives its default icon URLs from the stylesheet's location, which a
// bundler moves; passing the imported files keeps the marker bundled and found.
const MARKER_ICON = L.icon({
  iconUrl: markerUrl,
  iconRetinaUrl: markerRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

export function createMap(container: HTMLElement, options: MapOptions): MapHandle {
  const map = L.map(container, {
    center: [options.lat, options.lon],
    zoom: MAP_INITIAL_ZOOM,
    minZoom: MAP_MIN_ZOOM,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    // The container is not a tab stop: the search field and the Coordinates switch are
    // the keyboard route, and the page should pass the map without stopping on it.
    keyboard: false,
    worldCopyJump: true,
  });

  L.control
    .zoom({ zoomInTitle: options.labels.zoomIn, zoomOutTitle: options.labels.zoomOut })
    .addTo(map);
  // Always visible (ADR-0008). The Leaflet prefix is dropped: it adds a link and a
  // flag nobody asked for, and the policy asks only for the OpenStreetMap credit.
  L.control.attribution({ prefix: false }).addAttribution(options.labels.attributionHtml).addTo(map);

  let loaded = 0;
  let errors = 0;
  const tiles = L.tileLayer(TILE_URL_TEMPLATE, { maxZoom: TILE_MAX_ZOOM });
  tiles.on("tileload", () => {
    loaded += 1;
  });
  tiles.on("tileerror", () => {
    errors += 1;
  });
  // `load` fires when the visible tiles have each loaded or failed.
  tiles.on("load", () => {
    if (loaded > 0) options.onTilesFailed(false);
    else if (errors > 0) options.onTilesFailed(true);
  });
  tiles.addTo(map);

  const marker = L.marker([options.lat, options.lon], {
    icon: MARKER_ICON,
    draggable: true,
    // Moving a marker has no keyboard form, so it is not a tab stop; search and
    // the coordinate fields are the keyboard route.
    keyboard: false,
    alt: options.labels.marker,
  }).addTo(map);

  map.on("click", (event: L.LeafletMouseEvent) => {
    marker.setLatLng(event.latlng);
    options.onPick(event.latlng.lat, event.latlng.lng);
  });
  marker.on("dragend", () => {
    const at = marker.getLatLng();
    options.onPick(at.lat, at.lng);
  });

  return {
    setLocation(lat: number, lon: number, focus: MapFocus) {
      const at = L.latLng(lat, lon);
      marker.setLatLng(at);
      if (focus === "place") {
        map.setView(at, Math.max(map.getZoom(), MAP_PLACE_ZOOM));
      } else if (!map.getBounds().contains(at)) {
        map.panTo(at);
      }
    },
    destroy() {
      map.remove();
    },
  };
}
