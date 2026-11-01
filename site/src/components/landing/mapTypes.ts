/**
 * What the lazy map module offers the landing, kept apart from Leaflet so the
 * page can type against it without importing the library.
 */
export interface MapLabels {
  zoomIn: string;
  zoomOut: string;
  marker: string;
  /** Attribution as HTML: the copyright and "report a problem" links. */
  attributionHtml: string;
}

export interface MapOptions {
  lat: number;
  lon: number;
  labels: MapLabels;
  /** A click on the map, or the end of a marker drag. */
  onPick: (lat: number, lon: number) => void;
  /** True once tiles have been requested and none could load; false after one does. */
  onTilesFailed: (failed: boolean) => void;
}

export type MapFocus = "keep" | "place";

export interface MapHandle {
  /** Move the marker. `place` also brings the place into view, close enough to see. */
  setLocation: (lat: number, lon: number, focus: MapFocus) => void;
  destroy: () => void;
}

export interface MapModule {
  createMap: (container: HTMLElement, options: MapOptions) => MapHandle;
}
