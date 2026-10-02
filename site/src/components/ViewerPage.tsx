import { useCallback, useEffect, useRef, useState } from "react";
import { formatLocalTime } from "../lib/caption.ts";
import {
  stripUnsupported,
  titleAdjustedMessage,
  unsupportedInPosterFont,
} from "../lib/render/glyphs.ts";
import {
  decodeShareFragment,
  fragmentFromHash,
  ShareDecodeError,
  ShareVersionError,
  type SharePayload,
} from "../lib/share.ts";
import {
  useSkyModel,
  type SegmentRow,
  type StarRow,
} from "../lib/skymodel.ts";
import FiguresPanel from "./FiguresPanel.tsx";
import ExportControls from "./ExportControls.tsx";
import SkyCanvas, { HOME_VIEW, type View } from "./SkyCanvas.tsx";
import { EmptyState, InvalidState, LegacyState } from "./States.tsx";
import { t } from "../i18n/index.ts";
import SiteFooter from "./SiteFooter.tsx";

type LinkState =
  | { kind: "empty" }
  | { kind: "legacy" }
  | { kind: "invalid"; detail: string }
  | { kind: "ready"; payload: SharePayload; fragment: string };

function readLink(): LinkState {
  const fragment = fragmentFromHash(window.location.hash);
  if (!fragment) return { kind: "empty" };
  try {
    const payload = decodeShareFragment(fragment);
    return { kind: "ready", payload, fragment };
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

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

/**
 * The poster's face, and a probe string for checking it resolved (BCR-0007).
 *
 * The family must match `render-spec.json`'s `fonts` entry and the `@font-face`
 * in `index.css`; the size is arbitrary — `check()` reports whether the face is
 * available, not whether a particular string renders.
 */
const POSTER_FONT_FAMILY = "Cormorant Garamond";
const POSTER_FONT_PROBE = `16px "${POSTER_FONT_FAMILY}"`;

export default function ViewerPage() {
  const [link, setLink] = useState<LinkState>(() => readLink());
  const [catalog, setCatalog] = useState<StarRow[] | null>(null);
  const [segments, setSegments] = useState<SegmentRow[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<number | null>(null);
  const [view, setView] = useState<View>(HOME_VIEW);
  const [fontsReady, setFontsReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef(0);
  /**
   * Announced async outcomes (000-design-system T035).
   *
   * A canvas that appears silently, and a figure that lights up without saying
   * so, are both invisible to anyone not looking at the screen. The export row
   * already announced via its own `role="status"`; these two were the gap.
   *
   * Polite, not assertive: nothing here is an error. The font failure stays
   * `role="alert"` because it withholds the poster (BCR-0007).
   */
  const [announcement, setAnnouncement] = useState("");
  // The adjusted payload, or null while the shared title is drawable as sent.
  const [adjusted, setAdjusted] = useState<SharePayload | null>(null);
  const [titleAdjusted, setTitleAdjusted] = useState<string | null>(null);


  // Track `#s=` across in-page navigation and pastes.
  useEffect(() => {
    const onHash = () => {
      setLink(readLink());
      setSelected(null);
      setHovered(null);
      setTooltip(null);
      setView(HOME_VIEW);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  // Atlas type for the on-canvas caption; redraw once it arrives.
  //
  // BCR-0007: if the poster's face does not actually resolve, say so instead of
  // drawing the caption in whatever the browser substituted. A wrong poster with
  // no warning is the failure BCR-0004 was written to remove, and the browser
  // reintroduced it — a font load failure is invisible to every other gate,
  // because the reference suite renders from disk.
  useEffect(() => {
    let live = true;
    document.fonts.ready
      .then(() => {
        if (!live) return;
        if (document.fonts.check(POSTER_FONT_PROBE)) {
          setFontsReady(true);
        } else {
          setFontError(
            `the poster font "${POSTER_FONT_FAMILY}" did not load`,
          );
        }
      })
      .catch((error: unknown) => {
        if (live) {
          setFontError(
            error instanceof Error ? error.message : "the poster font failed to load",
          );
        }
      });
    return () => {
      live = false;
    };
  }, []);

  // A shared title can carry a character the poster face has no glyph for
  // (emoji, CJK). It would render as a notdef box — silently, and differently
  // in each export. Here we neither refuse the link nor hide the problem: the
  // character is dropped so the poster and its exports agree, and the
  // recipient is told, because a poster that quietly differs from what was
  // shared is the same dishonesty one level up. The authoring path rejects
  // instead, because there the visitor typed the title and can fix it.
  //
  // No readiness gate: `unsupportedInPosterFont` reads the font's `cmap`, which
  // is a property of the file rather than of what the browser has loaded, so it
  // is correct on the first render and identical in every environment. An
  // earlier version waited on `document.fonts.ready` because the probe measured
  // a canvas; that wait is exactly what let the letters of "E2E Night" be
  // stripped (see `lib/render/glyphs.ts`).
  useEffect(() => {
    if (link.kind !== "ready" || adjusted !== null) return;
    const original = link.payload.options.title;
    const place = link.payload.place;
    const nextTitle = stripUnsupported(original ?? "");
    const nextPlace = place === null ? null : stripUnsupported(place);
    const placeChanged =
      nextPlace !== null && place !== null && nextPlace !== place;
    if (nextTitle === null && !placeChanged) return;
    const removed = [
      ...unsupportedInPosterFont(original ?? ""),
      ...unsupportedInPosterFont(place ?? ""),
    ];
    setTitleAdjusted(titleAdjustedMessage(removed));
    setAdjusted({
      ...link.payload,
      place: placeChanged ? nextPlace || null : place,
      options: {
        ...link.payload.options,
        title: nextTitle === null ? original : nextTitle || null,
      },
    });
  }, [link, adjusted]);

  // Static catalog + line data (regenerate via `python -m starsky catalog`).
  useEffect(() => {
    let live = true;
    Promise.all([
      fetchJson<{ stars: [number, number, number, number][] }>(
        `${DATA_BASE}catalog.json`,
      ),
      fetchJson<{ segments: SegmentRow[] }>(`${DATA_BASE}constellations.json`),
    ])
      .then(([cat, con]) => {
        if (!live) return;
        setCatalog(
          cat.stars.map(([hip, raDeg, decDeg, mag]) => ({
            hip,
            raDeg,
            decDeg,
            mag,
          })),
        );
        setSegments(con.segments);
        setLoaded(true);
        setAnnouncement(t("viewer.announced.ready"));
      })
      .catch((error: unknown) => {
        if (live) {
          setDataError(
            error instanceof Error ? error.message : "could not load data",
          );
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const payload = adjusted ?? (link.kind === "ready" ? link.payload : null);
  const model = useSkyModel(
    payload ?? {
      v: 1,
      lat: 0,
      lon: 0,
      place: null,
      when_utc: new Date(0).toISOString(),
      tz: "UTC",
      options: {
        projection: "stereographic",
        fisheye_strength: 1,
        min_separation: 0,
        magnitude_limit: 0,
        glow: false,
        glow_intensity: 1,
        constellations: true,
        constellation_labels: true,
        shape: "circle",
        title: null,
      },
    },
    catalog,
    segments,
  );

  const animateView = useCallback((target: View) => {
    cancelAnimationFrame(animRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(target);
      return;
    }
    const start = performance.now();
    const duration = 650;
    // Capture the current view at animation start.
    setView((current) => {
      const from = { ...current };
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased =
          t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        setView({
          scale: from.scale + (target.scale - from.scale) * eased,
          fx: from.fx + (target.fx - from.fx) * eased,
          fy: from.fy + (target.fy - from.fy) * eased,
        });
        if (t < 1) animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
      return current;
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const resetView = useCallback(() => {
    setSelected(null);
    setHovered(null);
    setAnnouncement(t("viewer.announced.viewReset"));
    setTooltip(null);
    animateView(HOME_VIEW);
  }, [animateView]);

  // Esc releases a focused figure.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected !== null) resetView();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [selected, resetView]);

  const handleSelect = useCallback(
    (index: number) => {
      if (!model) return;
      const fig = model.figures[index];
      setSelected(index);
      setTooltip(null);
      // Announce what was focused *and* what now fills the view, since the
      // zoom is the whole point of selecting.
      setAnnouncement(
        t("viewer.announced.figureSelected", { name: fig.name }),
      );
      animateView({ scale: 2.4, fx: fig.centroidX, fy: fig.centroidY });
    },
    [model, animateView],
  );

  const handleHoverFigure = useCallback((index: number | null) => {
    setHovered(index);
    setTooltip(index);
  }, []);

  return (
    <div className="atlas-page">
      <header className="atlas-header">
        <div>
          <p className="font-display text-2xl leading-none">Starsky</p>
          <p className="mt-1 text-xs tracking-wide text-cream/55">
            {t("viewer.subtitle")}
          </p>
        </div>
      </header>

      <main className="atlas-main">
        {link.kind === "empty" && <EmptyState />}
        {link.kind === "legacy" && <LegacyState />}
        {link.kind === "invalid" && <InvalidState detail={link.detail} />}

        {link.kind === "ready" && payload && (
          <>
            <div className="atlas-moment">
              <p className="font-display text-3xl leading-tight sm:text-4xl">
                {payload.options.title ?? payload.place ?? "This night sky"}
              </p>
              <p className="mt-2 text-sm text-cream/65">
                {formatLocalTime(payload.when_utc, payload.tz)} ·{" "}
                {payload.options.projection === "fisheye"
                  ? "fisheye"
                  : "stereographic"}{" "}
                projection
              </p>
            </div>

            {dataError && (
              <p role="alert" className="atlas-alert">
                {t("dataError.bodyPrefix", { detail: dataError })}
                <code className="atlas-code">{t("dataError.command")}</code>
                {t("dataError.bodySuffix")}
              </p>
            )}

            {titleAdjusted && (
              <p role="status" className="atlas-alert">
                {titleAdjusted}
              </p>
            )}

            {fontError && (
              <p role="alert" className="atlas-alert">
                {t("fontError.bodyPrefix", { detail: fontError })}
                {t("fontError.bodySuffix")}
              </p>
            )}

            {model && !fontError ? (
              <div
                className={`atlas-explorer ${loaded ? "atlas-loaded" : ""}`}
              >
                <div className="relative">
                  <SkyCanvas
                    payload={payload}
                    model={model}
                    view={view}
                    hovered={hovered}
                    selected={selected}
                    canvasRef={canvasRef}
                    onHoverFigure={handleHoverFigure}
                    onSelectFigure={handleSelect}
                    fontsReady={fontsReady}
                  />
                  {tooltip !== null && model.figures[tooltip] && (
                    <div className="atlas-tooltip" role="status">
                      <FigureTooltip
                        figure={model.figures[tooltip]}
                      />
                    </div>
                  )}
                </div>
                <FiguresPanel
                  figures={model.figures}
                  hovered={hovered}
                  selected={selected}
                  onHover={(i) => {
                    setHovered(i);
                    setTooltip(i);
                  }}
                  onSelect={handleSelect}
                  onReset={resetView}
                />
              </div>
            ) : (
              !dataError && (
                <p className="atlas-loading" role="status">
                  {t("viewer.loading")}
                </p>
              )
            )}

            {model && <ExportControls payload={payload} model={model} />}

            {/*
              Async outcomes (000-design-system T035). `sr-only` keeps it out of
              the visual layout — an empty box with reserved space would shift
              the page, and the message is for a screen reader only.

              `aria-label` names the region. The export row has its own status
              region, and two unlabelled ones are ambiguous to a screen-reader
              user: you cannot tell which is talking.
            */}
            <p
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-label={t("viewer.announcementRegion")}
            >
              {announcement}
            </p>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function FigureTooltip({
  figure,
}: {
  figure: { name: string; starIndices: number[]; brightestMag: number };
}) {
  return (
    <div className="pointer-events-none mx-auto w-fit">
      <p className="font-display text-lg leading-none">{figure.name}</p>
      <p className="mt-1 text-xs text-cream/70">
        {t("figures.tooltip", {
          count: figure.starIndices.length,
          mag: figure.brightestMag.toFixed(1),
        })}
      </p>
    </div>
  );
}
