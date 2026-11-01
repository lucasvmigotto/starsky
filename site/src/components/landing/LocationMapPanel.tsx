/**
 * The map under the place field: always on the page, its Leaflet code loaded
 * lazily. Its box is the same size while it loads or if it fails, so nothing
 * below it moves. Under it, one line with the map hint and the Nominatim credit, then a privacy line (OpenStreetMap sees the visitor's IP) (the OpenStreetMap credit is the map's own always-visible attribution, ADR-0008); a tile failure
 * is reported in place, in the flow.
 */
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import LocationMap, { type MapProblem } from "./LocationMap.tsx";
import type { MapFocus, MapModule } from "./mapTypes.ts";

interface Props {
  problem: MapProblem | null;
  lat: number;
  lon: number;
  focus: MapFocus;
  load?: () => Promise<MapModule>;
  onPick: (lat: number, lon: number) => void;
  onProblem: (problem: MapProblem | null) => void;
}

const loadLeaflet = (): Promise<MapModule> => import("./leafletMap.ts");

export default function LocationMapPanel({
  problem,
  lat,
  lon,
  focus,
  load = loadLeaflet,
  onPick,
  onProblem,
}: Props): JSX.Element {
  const [privacyBefore = "", privacyAfter = ""] = t("landing.privacy", { osm: "\u0001" }).split("\u0001");
  return (
    <div className="landing-map">
      <div role="region" aria-label={t("landing.map.label")} className="landing-map-region">
        <LocationMap
          lat={lat}
          lon={lon}
          focus={focus}
          problem={problem}
          onPick={onPick}
          onProblem={onProblem}
          load={load}
        />
      </div>
      {problem === "tiles" && (
        <p role="status" className="atlas-form-hint landing-map-tiles-notice">
          {t("landing.map.tilesFailed")}
        </p>
      )}
      <p className="atlas-form-hint">
        {t("landing.map.hint")}
        {" · "}
        {t("landing.search.credit")}
      </p>
      <p className="atlas-form-hint landing-privacy">
        {privacyBefore}
        <a href="https://osmfoundation.org/wiki/Privacy_Policy">{t("landing.privacy.osm")}</a>
        {privacyAfter}
      </p>
    </div>
  );
}
