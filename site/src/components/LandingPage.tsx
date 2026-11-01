import { useState, type SubmitEvent as ReactSubmitEvent } from "react";
import { encodePayload } from "../lib/encode.ts";
import { geocodePlace, OSM_ATTRIBUTION, type ResolvedPlace } from "../lib/geocode.ts";
import {
  unsupportedCharacterMessage,
  unsupportedInPosterFont,
} from "../lib/render/glyphs.ts";
import type { SharePayload } from "../lib/share.ts";
import { fragmentFromHash } from "../lib/share.ts";
import { t } from "../i18n/index.ts";
import { randomSampleFragment } from "../lib/site.ts";
import { DEFAULTS } from "../lib/scene/defaults.ts";
import { toWhenUtcIso, zonedTimeToUtc } from "../lib/time.ts";
import PosterFields, { type PosterFieldValues } from "./poster/PosterFields.tsx";
import { EmptyState } from "./States.tsx";

type LocationMode = "coordinates" | "place";

function goToSample() {
  window.location.hash = `#s=${randomSampleFragment(fragmentFromHash(window.location.hash))}`;
}

function parseDateTimeLocal(value: string): [number, number, number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5])];
}

export default function LandingPage() {
  const [mode, setMode] = useState<LocationMode>(DEFAULTS.mode);
  const [lat, setLat] = useState<string>(DEFAULTS.lat);
  const [lon, setLon] = useState<string>(DEFAULTS.lon);
  const [place, setPlace] = useState<string>(DEFAULTS.place);
  const [resolved, setResolved] = useState<ResolvedPlace | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [when, setWhen] = useState<string>(DEFAULTS.when);
  const [tz, setTz] = useState<string>(DEFAULTS.tz);
  const [fields, setFields] = useState<PosterFieldValues>({
    projection: DEFAULTS.projection,
    fisheyeStrength: DEFAULTS.fisheyeStrength,
    minSeparation: DEFAULTS.minSeparation,
    magnitudeLimit: DEFAULTS.magnitudeLimit,
    glow: DEFAULTS.glow,
    glowIntensity: DEFAULTS.glowIntensity,
    constellations: DEFAULTS.constellations,
    constellationLabels: DEFAULTS.constellationLabels,
    shape: DEFAULTS.shape,
    title: DEFAULTS.title,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const detectTimezone = () => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone) setTz(zone);
    } catch {
      // Intl without timezone data: leave the field untouched.
    }
  };

  /** Resolve the place field on blur so the resolved line previews early. */
  const resolveOnBlur = async () => {
    const query = place.trim();
    if (mode !== "place" || !query || query === resolvedFor || resolving) return;
    setResolving(true);
    try {
      const hit = await geocodePlace(query);
      setResolved(hit);
      setResolvedFor(query);
    } catch {
      // Inline errors surface on submit; a blur miss just clears the preview.
      if (query !== resolvedFor) {
        setResolved(null);
        setResolvedFor(null);
      }
    } finally {
      setResolving(false);
    }
  };

  const handleSubmit = async (e: ReactSubmitEvent) => {
    e.preventDefault();
    setError(null);

    const parts = parseDateTimeLocal(when);
    if (!parts) {
      setError("Pick a date and time for the sky.");
      return;
    }
    const zone = tz.trim() || "UTC";
    let whenUtc: Date;
    try {
      whenUtc = zonedTimeToUtc(parts[0], parts[1], parts[2], parts[3], parts[4], zone);
    } catch {
      setError(`Unknown timezone ${JSON.stringify(zone)}. Use an IANA name like "America/New_York".`);
      return;
    }

    let flat: number;
    let flon: number;
    let placeLabel: string | null;
    if (mode === "coordinates") {
      flat = Number(lat);
      flon = Number(lon);
      if (!Number.isFinite(flat) || flat < -90 || flat > 90) {
        setError("Latitude must be a number between -90 and 90.");
        return;
      }
      if (!Number.isFinite(flon) || flon < -180 || flon > 180) {
        setError("Longitude must be a number between -180 and 180.");
        return;
      }
      placeLabel = null;
    } else {
      const query = place.trim();
      if (!query) {
        setError("Enter a place name or switch to coordinates mode.");
        return;
      }
      setBusy(true);
      try {
        const hit =
          resolved && resolvedFor === query ? resolved : await geocodePlace(query);
        setResolved(hit);
        setResolvedFor(query);
        flat = hit.lat;
        flon = hit.lon;
        placeLabel = hit.short;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not resolve that place.");
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }

    const cleanTitle = fields.title.trim();

    // The poster face has no glyph for emoji or CJK, so those characters would
    // render as a notdef box — silently, and differently in each export. Here the
    // visitor typed the title and has made nothing yet, so refusing costs them
    // nothing and naming the character lets them fix it. The decode path makes
    // the opposite trade, because there the recipient cannot fix the sender's
    // title. See `lib/render/glyphs.ts` and
    // `specs/007-renderer-export/finding-unsupported-glyphs.md`.
    const undrawable = unsupportedInPosterFont(cleanTitle);
    if (undrawable.length > 0) {
      setError(unsupportedCharacterMessage(undrawable[0]));
      return;
    }

    const payload: SharePayload = {
      v: 1,
      lat: flat,
      lon: flon,
      place: placeLabel,
      when_utc: toWhenUtcIso(whenUtc),
      tz: zone,
      options: {
        projection: fields.projection,
        fisheye_strength: fields.fisheyeStrength,
        min_separation: fields.minSeparation,
        magnitude_limit: fields.magnitudeLimit,
        glow: fields.glow,
        glow_intensity: fields.glowIntensity,
        constellations: fields.constellations,
        constellation_labels: fields.constellationLabels,
        shape: fields.shape,
        title: cleanTitle ? cleanTitle : null,
      },
    };
    window.location.hash = `#s=${encodePayload(payload)}`;
  };

  return (
    <div className="atlas-form-wrap">
      <div className="atlas-moment">
        <p className="font-display text-3xl leading-tight sm:text-4xl">
          {t("landing.title")}
        </p>
        <p className="mt-2 text-sm text-text-muted">
          {t("landing.subtitle")}
        </p>
      </div>

      <form className="atlas-panel atlas-form" onSubmit={(e) => void handleSubmit(e)}>
        <fieldset className="atlas-form-group">
          <legend className="atlas-form-legend">Location</legend>
          <div className="atlas-form-radio-row" role="radiogroup" aria-label={t("landing.mode.label")}>
            {(["coordinates", "place"] as const).map((m) => (
              <label key={m} className="atlas-form-radio">
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => {
                    setMode(m);
                  }}
                />
                {m}
              </label>
            ))}
          </div>

          {mode === "coordinates" ? (
            <div className="atlas-form-grid">
              <div className="atlas-form-field">
                <label htmlFor="landing-lat">Latitude</label>
                <input
                  id="landing-lat"
                  type="number"
                  className="atlas-form-input"
                  min={-90}
                  max={90}
                  step="any"
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                  }}
                />
              </div>
              <div className="atlas-form-field">
                <label htmlFor="landing-lon">Longitude</label>
                <input
                  id="landing-lon"
                  type="number"
                  className="atlas-form-input"
                  min={-180}
                  max={180}
                  step="any"
                  value={lon}
                  onChange={(e) => {
                    setLon(e.target.value);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="atlas-form-field">
              <label htmlFor="landing-place">Place</label>
              <input
                id="landing-place"
                type="text"
                className="atlas-form-input"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                }}
                onBlur={() => void resolveOnBlur()}
                autoComplete="off"
              />
              <p className="atlas-form-hint" aria-live="polite">
                {resolving
                  ? "Resolving…"
                  : resolved && resolvedFor === place.trim()
                    ? `Resolved: ${resolved.short}`
                    : "Resolved place appears here after lookup."}
              </p>
              <p className="atlas-form-hint">Geocoding by {OSM_ATTRIBUTION}.</p>
            </div>
          )}
        </fieldset>

        <fieldset className="atlas-form-group">
          <legend className="atlas-form-legend">{t("landing.moment.legend")}</legend>
          <div className="atlas-form-field">
            <label htmlFor="landing-when">{t("landing.moment.legend")}</label>
            <input
              id="landing-when"
              type="datetime-local"
              className="atlas-form-input"
              required
              value={when}
              onChange={(e) => {
                setWhen(e.target.value);
              }}
            />
          </div>
          <div className="atlas-form-field">
            <label htmlFor="landing-tz">Timezone</label>
            <div className="atlas-form-row">
              <input
                id="landing-tz"
                type="text"
                className="atlas-form-input"
                value={tz}
                onChange={(e) => {
                  setTz(e.target.value);
                }}
                autoComplete="off"
              />
              <button type="button" className="atlas-btn-ghost" onClick={detectTimezone}>
                Detect
              </button>
            </div>
          </div>
        </fieldset>

        <PosterFields
          idPrefix="landing"
          legends={{
            sky: t("landing.sky.legend"),
            appearance: t("landing.appearance.legend"),
            observation: t("landing.observation.legend"),
          }}
          titleLabel="Title (optional)"
          value={fields}
          onChange={(patch) => {
            setFields((current) => ({ ...current, ...patch }));
          }}
        />

        {error && (
          <p role="alert" className="atlas-form-error">
            {error}
          </p>
        )}

        <button type="submit" className="atlas-btn atlas-form-submit" disabled={busy}>
          {busy ? "Resolving place…" : "Show my sky"}
        </button>
      </form>

      <p className="atlas-form-alt">
        {t("landing.browse")}{" "}
        <button type="button" className="atlas-link atlas-form-linkbtn" onClick={goToSample}>
          {t("landing.browse.action")}
        </button>
        .
      </p>
      <details className="atlas-form-details atlas-form-explainer">
        <summary>{t("landing.explain")}</summary>
        <EmptyState />
      </details>
    </div>
  );
}
