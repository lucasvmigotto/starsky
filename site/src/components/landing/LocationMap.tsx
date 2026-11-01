/**
 * Lifecycle of the lazy map: load the Leaflet module on mount, create the map,
 * keep its marker in step with the page, and tear it down. Everything the
 * visitor needs to continue works without it, so a failed load is reported
 * upward and nothing here blocks.
 */
import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { useLocale } from "../../i18n/useLocale.ts";
import { OSM_COPYRIGHT_URL, OSM_FIXTHEMAP_URL } from "../../lib/landing/map-config.ts";
import type { MapFocus, MapHandle, MapLabels, MapModule } from "./mapTypes.ts";

/** How long the container rests before the map is told its size changed. */
export const RESIZE_DEBOUNCE_MS = 100;

export type MapProblem = "chunk" | "tiles";

interface Props {
  lat: number;
  lon: number;
  focus: MapFocus;
  problem: MapProblem | null;
  onPick: (lat: number, lon: number) => void;
  onProblem: (problem: MapProblem | null) => void;
  /** The module loader; a dynamic import, replaceable in tests. */
  load: () => Promise<MapModule>;
}

function link(href: string, text: string): string {
  return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
}

function labels(): MapLabels {
  return {
    zoomIn: t("explorer.toolbar.zoomIn"),
    zoomOut: t("explorer.toolbar.zoomOut"),
    marker: t("landing.map.marker"),
    attributionHtml: t("landing.map.attribution", {
      osm: link(OSM_COPYRIGHT_URL, t("landing.map.osm")),
      report: link(OSM_FIXTHEMAP_URL, t("landing.map.report")),
    }),
  };
}

export default function LocationMap({
  lat,
  lon,
  focus,
  problem,
  onPick,
  onProblem,
  load,
}: Props): JSX.Element {
  const container = useRef<HTMLDivElement | null>(null);
  const handle = useRef<MapHandle | null>(null);
  const [ready, setReady] = useState(false);
  // The effect that creates the map runs once; it reads these when it needs them.
  const latest = useRef({ lat, lon, onPick, onProblem, load });
  latest.current = { lat, lon, onPick, onProblem, load };

  useEffect(() => {
    let cancelled = false;
    latest.current
      .load()
      .then((module) => {
        const element = container.current;
        if (cancelled || !element) return;
        handle.current = module.createMap(element, {
          lat: latest.current.lat,
          lon: latest.current.lon,
          labels: labels(),
          onPick: (pickedLat, pickedLon) => {
            latest.current.onPick(pickedLat, pickedLon);
          },
          onTilesFailed: (failed) => {
            latest.current.onProblem(failed ? "tiles" : null);
          },
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) latest.current.onProblem("chunk");
      });
    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (ready) handle.current?.setLocation(lat, lon, focus);
  }, [ready, lat, lon, focus]);

  // Leaflet keeps the strings it was built with; a language switch passes the new ones on.
  const locale = useLocale();
  const builtIn = useRef(locale);
  useEffect(() => {
    if (!ready || builtIn.current === locale) return;
    builtIn.current = locale;
    handle.current?.setLabels(labels());
  }, [ready, locale]);

  // The page may give the map more or less room as the window changes; Leaflet only
  // redraws its tiles when told, so a resize of the container is passed on (debounced).
  useEffect(() => {
    const element = container.current;
    if (!ready || !element || !("ResizeObserver" in window)) return;
    let timer: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        handle.current?.resize();
      }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(element);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [ready]);

  // The box keeps its size whatever it holds, so the page below never shifts.
  return (
    <div className="landing-map-box">
      <div ref={container} className="landing-map-canvas" hidden={problem === "chunk"} />
      {problem === "chunk" && (
        <p role="status" className="landing-map-notice">
          {t("landing.map.chunkFailed")}
        </p>
      )}
      {problem !== "chunk" && !ready && (
        <p role="status" className="landing-map-notice">
          {t("landing.map.loading")}
        </p>
      )}
    </div>
  );
}
