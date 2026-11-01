/**
 * The map section of the landing: a toggle that opens it (tiles are requested
 * only after that, ADR-0008), an icon button that enlarges it in the page, a
 * control that skips past it, and the notices for a map that could not load.
 */
import { useEffect } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { Icon } from "../icons.tsx";
import LocationMap, { type MapProblem } from "./LocationMap.tsx";
import type { MapFocus, MapModule } from "./mapTypes.ts";

interface Props {
  open: boolean;
  expanded: boolean;
  problem: MapProblem | null;
  lat: number;
  lon: number;
  focus: MapFocus;
  /** The control after the map, which "Skip the map" moves focus to. */
  skipToId: string;
  load?: () => Promise<MapModule>;
  onToggle: () => void;
  onExpandToggle: () => void;
  onEscape: () => void;
  onPick: (lat: number, lon: number) => void;
  onProblem: (problem: MapProblem | null) => void;
}

const loadLeaflet = (): Promise<MapModule> => import("./leafletMap.ts");

export default function LocationMapPanel({
  open,
  expanded,
  problem,
  lat,
  lon,
  focus,
  skipToId,
  load = loadLeaflet,
  onToggle,
  onExpandToggle,
  onEscape,
  onPick,
  onProblem,
}: Props): JSX.Element {
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, onEscape]);

  const label = expanded ? t("landing.map.collapse") : t("landing.map.expand");

  return (
    <div className="landing-map">
      <div className="landing-map-bar">
        <button type="button" className="atlas-btn-ghost" aria-expanded={open} onClick={onToggle}>
          {open ? t("landing.map.hide") : t("landing.map.show")}
        </button>
        {open && problem !== "chunk" && (
          <button
            type="button"
            className="atlas-btn-icon"
            aria-label={label}
            title={label}
            aria-pressed={expanded}
            onClick={onExpandToggle}
          >
            <Icon name={expanded ? "collapse" : "expand"} />
          </button>
        )}
      </div>
      {open && problem === "chunk" && (
        <p role="status" className="atlas-form-hint landing-map-notice">
          {t("landing.map.chunkFailed")}
        </p>
      )}
      {open && problem !== "chunk" && (
        <div
          role="region"
          aria-label={t("landing.map.label")}
          className="landing-map-frame"
          data-expanded={expanded}
        >
          <button
            type="button"
            className="landing-map-skip"
            onClick={() => {
              document.getElementById(skipToId)?.focus();
            }}
          >
            {t("landing.map.skip")}
          </button>
          <LocationMap
            lat={lat}
            lon={lon}
            focus={focus}
            expanded={expanded}
            onPick={onPick}
            onProblem={onProblem}
            load={load}
          />
          <p className="atlas-form-hint">{t("landing.map.hint")}</p>
          {problem === "tiles" && (
            <p role="status" className="atlas-form-hint landing-map-notice">
              {t("landing.map.tilesFailed")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
