/**
 * The page behind `#studio=`: a live poster preview with the poster-only
 * controls beside it, a read-only summary of the moment, share and export, and
 * the way back to the Explorer (012-poster-studio).
 *
 * The draft is a share payload under its own prefix. Edits are debounced: the
 * controls show their new value at once, the preview and the fragment follow
 * once input settles, and the fragment is written with `replaceState`, which
 * raises no `hashchange`, so nothing reloads.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import { encodePayload } from "../../lib/encode.ts";
import { formatCoords, formatLocalTime } from "../../lib/caption.ts";
import { absoluteLink } from "../../lib/explorer/link.ts";
import { posterGeometry, renderPoster } from "../../lib/render/poster.ts";
import {
  titleAdjustedMessage,
  unsupportedCharacterMessage,
  unsupportedInPosterFont,
} from "../../lib/render/glyphs.ts";
import { returnToExplorerHash } from "../../lib/scene/handoff.ts";
import {
  type SharePayload,
  ShareDecodeError,
  ShareVersionError,
} from "../../lib/share.ts";
import {
  CANVAS_W,
  DISK_CX,
  DISK_CY,
  DISK_R,
  type SegmentRow,
  type StarRow,
  useSkyModel,
} from "../../lib/skymodel.ts";
import {
  adjustUndrawable,
  decodeDraft,
  draftHash,
  studioFragmentFromHash,
} from "../../lib/studio/draft.ts";
import ExportControls from "../ExportControls.tsx";
import ShareDialog from "../ShareDialog.tsx";
import PosterFields, { type PosterFieldValues } from "../poster/PosterFields.tsx";
import PosterHeading from "../PosterHeading.tsx";
import SiteFooter from "../SiteFooter.tsx";
import SiteHeader from "../SiteHeader.tsx";
import { Icon } from "../icons.tsx";

/** How long input must rest before the preview and the fragment follow it. */
export const DRAFT_DEBOUNCE_MS = 150;

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;
const PREVIEW = { diskCx: DISK_CX, diskCy: DISK_CY, diskR: DISK_R };
const POSTER_FONT_FAMILY = "Cormorant Garamond";
const POSTER_FONT_PROBE = `16px "${POSTER_FONT_FAMILY}"`;

type DraftState =
  | { kind: "ready"; payload: SharePayload; adjusted: string | null }
  | { kind: "legacy" }
  | { kind: "invalid"; detail: string };

function readDraft(): DraftState {
  const fragment = studioFragmentFromHash(window.location.hash);
  if (fragment === null) return { kind: "invalid", detail: "empty link" };
  try {
    const { payload, removed } = adjustUndrawable(decodeDraft(fragment));
    return {
      kind: "ready",
      payload,
      adjusted: removed.length > 0 ? titleAdjustedMessage(removed) : null,
    };
  } catch (error) {
    if (error instanceof ShareVersionError) return { kind: "legacy" };
    const detail =
      error instanceof ShareDecodeError
        ? error.message.replace("Invalid share payload: ", "")
        : "unreadable payload";
    return { kind: "invalid", detail };
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${String(res.status)} for ${url}`);
  return (await res.json()) as T;
}

function fieldsOf(payload: SharePayload): PosterFieldValues {
  const o = payload.options;
  return {
    projection: o.projection,
    fisheyeStrength: o.fisheye_strength,
    minSeparation: o.min_separation,
    magnitudeLimit: o.magnitude_limit,
    glow: o.glow,
    glowIntensity: o.glow_intensity,
    constellations: o.constellations,
    constellationLabels: o.constellation_labels,
    shape: o.shape,
    title: o.title ?? "",
  };
}

function payloadOf(scene: SharePayload, fields: PosterFieldValues, title: string | null): SharePayload {
  return {
    ...scene,
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
      title,
    },
  };
}

function Preview({
  payload,
  model,
  fontsReady,
}: {
  payload: SharePayload;
  model: NonNullable<ReturnType<typeof useSkyModel>>;
  fontsReady: boolean;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dpr, setDpr] = useState(() => Math.min(3, window.devicePixelRatio || 1));

  // Browser zoom changes the ratio without a reload; redraw at the new one.
  useEffect(() => {
    const onResize = (): void => {
      setDpr(Math.min(3, window.devicePixelRatio || 1));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontsReady) return;
    // The page shows the sky image only (015); the caption stays in the
    // exports. Compose the whole poster, then blit its sky rows.
    const geometry = posterGeometry(CANVAS_W);
    const whole = document.createElement("canvas");
    whole.width = Math.round(geometry.sizePx * dpr);
    whole.height = Math.round(geometry.canvasHeight * dpr);
    const wholeCtx = whole.getContext("2d");
    const ctx = canvas.getContext("2d");
    if (!wholeCtx) return;
    renderPoster(wholeCtx, payload, model, CANVAS_W, dpr, PREVIEW);
    const rows = Math.round(geometry.skyPx * dpr);
    canvas.width = whole.width;
    canvas.height = rows;
    ctx?.drawImage(whole, 0, 0, whole.width, rows, 0, 0, whole.width, rows);
  }, [payload, model, fontsReady, dpr]);

  const title = payload.options.title;
  return (
    <canvas
      ref={canvasRef}
      className="atlas-studio-canvas"
      role="img"
      aria-label={title ? t("viewer.canvasLabel", { title }) : t("viewer.canvasLabel.untitled")}
    />
  );
}

function BackLink(): JSX.Element {
  return (
    <a className="atlas-btn" href="#/">
      {t("studio.back")}
    </a>
  );
}

function StateScreen({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <main className="explorer-state">
      <div className="atlas-empty">
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-text-muted" role="alert">
          {body}
        </p>
        <div className="mt-6 flex justify-center">
          <BackLink />
        </div>
      </div>
    </main>
  );
}

export default function StudioPage(): JSX.Element {
  const [draft] = useState<DraftState>(readDraft);
  if (draft.kind === "invalid") {
    return <StateScreen title={t("invalid.title")} body={t("invalid.body", { detail: draft.detail })} />;
  }
  if (draft.kind === "legacy") {
    return <StateScreen title={t("legacy.title")} body={t("legacy.body")} />;
  }
  return <Studio initial={draft.payload} adjusted={draft.adjusted} />;
}

function Studio({ initial, adjusted }: { initial: SharePayload; adjusted: string | null }): JSX.Element {
  // The moment never changes here: it is the scene the draft arrived with.
  const [scene] = useState(initial);
  const [fields, setFields] = useState(() => fieldsOf(initial));
  const [catalog, setCatalog] = useState<StarRow[] | null>(null);
  const [segments, setSegments] = useState<SegmentRow[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // A title the poster face cannot draw is refused, as on the landing: the
  // visitor typed it and can fix it. The preview keeps the last good one.
  const trimmed = fields.title.trim();
  const undrawable = unsupportedInPosterFont(trimmed);
  const titleError =
    undrawable.length === 0 ? null : unsupportedCharacterMessage(undrawable.slice(0, 1).join(""));
  const lastGoodTitle = useRef<string | null>(initial.options.title);
  if (titleError === null) lastGoodTitle.current = trimmed === "" ? null : trimmed;

  const candidate = useMemo(
    () => payloadOf(scene, fields, lastGoodTitle.current),
    // `lastGoodTitle` is a ref read during render; `fields` and `titleError`
    // are what change it.
    [scene, fields, titleError],
  );
  const [applied, setApplied] = useState(candidate);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setApplied(candidate);
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [candidate]);

  // The fragment follows what is applied. `replaceState` raises no hashchange.
  const written = useRef(false);
  useEffect(() => {
    const hash = draftHash(applied);
    if (hash !== window.location.hash) {
      window.history.replaceState(window.history.state, "", hash);
    }
    if (written.current) setAnnouncement(t("studio.updated"));
    written.current = true;
  }, [applied]);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchJson<{ stars: [number, number, number, number][] }>(`${DATA_BASE}catalog.json`),
      fetchJson<{ segments: SegmentRow[] }>(`${DATA_BASE}constellations.json`),
    ]).then(
      ([cat, con]) => {
        if (!live) return;
        setCatalog(cat.stars.map(([hip, raDeg, decDeg, mag]) => ({ hip, raDeg, decDeg, mag })));
        setSegments(con.segments);
      },
      (error: unknown) => {
        if (live) setDataError(error instanceof Error ? error.message : "could not load data");
      },
    );
    return () => {
      live = false;
    };
  }, []);

  // BCR-0007: never draw the caption in a substituted face.
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(
      () => {
        if (!live) return;
        if (document.fonts.check(POSTER_FONT_PROBE)) setFontsReady(true);
        else setFontError(`the poster font "${POSTER_FONT_FAMILY}" did not load`);
      },
      (error: unknown) => {
        if (live) setFontError(error instanceof Error ? error.message : "the poster font failed to load");
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const model = useSkyModel(applied, catalog, segments);

  const returnHref = useMemo((): string | null => {
    try {
      return returnToExplorerHash(applied);
    } catch {
      return null;
    }
  }, [applied]);

  return (
    <div className="atlas-page">
      <SiteHeader />

      <main className="atlas-main">
        <div className="atlas-moment">
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{t("studio.poster.heading")}</h1>
          <p className="mt-2 text-sm text-text-muted">{t("studio.poster.subtitle")}</p>
        </div>

        {dataError !== null && (
          <p role="alert" className="atlas-alert">
            {t("dataError.bodyPrefix", { detail: dataError })}
            <code className="atlas-code">{t("dataError.command")}</code>
            {t("dataError.bodySuffix")}
          </p>
        )}
        {adjusted !== null && (
          <p role="status" className="atlas-alert">
            {adjusted}
          </p>
        )}
        {fontError !== null && (
          <p role="alert" className="atlas-alert">
            {t("fontError.bodyPrefix", { detail: fontError })}
            {t("fontError.bodySuffix")}
          </p>
        )}

        <div className="atlas-studio">
          <div className="atlas-studio-preview">
            <PosterHeading payload={applied} />
            {model && fontError === null ? (
              <Preview payload={applied} model={model} fontsReady={fontsReady} />
            ) : (
              dataError === null &&
              fontError === null && (
                <p className="atlas-loading" role="status">
                  {t("viewer.loading")}
                </p>
              )
            )}
          </div>

          <div className="atlas-studio-side">
            <fieldset className="atlas-panel">
              <legend className="atlas-form-legend">{t("studio.moment.legend")}</legend>
              {applied.place !== null && <p>{applied.place}</p>}
              <p className={applied.place === null ? undefined : "atlas-form-hint"}>
                {formatCoords(applied.lat, applied.lon)}
              </p>
              <p className="atlas-form-hint">{formatLocalTime(applied.when_utc, applied.tz)}</p>
              <p className="atlas-form-hint">{t("studio.summary.note")}</p>
            </fieldset>

            <div className="atlas-panel atlas-form">
              <PosterFields
                idPrefix="studio"
                collapsible={false}
                legends={{
                  appearance: t("studio.appearance.legend"),
                  advanced: t("studio.advanced.legend"),
                }}
                titleLabel={t("studio.title.label")}
                titlePlaceholder={t("studio.title.placeholder")}
                titleError={titleError}
                value={fields}
                onChange={(patch) => {
                  setFields((current) => ({ ...current, ...patch }));
                }}
              />
            </div>

            <div className="atlas-panel atlas-actions">
              {model && (
                <>
                  <ShareDialog
                    payload={applied}
                    getLink={() => absoluteLink(`#s=${encodePayload(applied)}`, window.location)}
                  />
                  <ExportControls payload={applied} model={model} />
                </>
              )}
              {returnHref !== null && (
                <div className="atlas-action-row">
                  <a className="atlas-btn-ghost" href={returnHref}>
                    <Icon name="explore" />
                    {t("studio.returnToExplorer")}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-label={t("viewer.announcementRegion")}>
          {announcement}
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
