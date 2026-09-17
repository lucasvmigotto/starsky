import { useCallback, useEffect, useRef, useState } from "react";
import { formatLocalTime } from "../lib/caption.ts";
import {
  decodeShareFragment,
  fragmentFromHash,
  ShareDecodeError,
  ShareVersionError,
  type SharePayload,
} from "../lib/share.ts";
import { FULL_APP_URL, SAMPLE_FRAGMENT } from "../lib/site.ts";
import {
  useSkyModel,
  type SegmentRow,
  type StarRow,
} from "../lib/skymodel.ts";
import FiguresPanel from "./FiguresPanel.tsx";
import SkyCanvas, { HOME_VIEW, type View } from "./SkyCanvas.tsx";
import { EmptyState, InvalidState, LegacyState } from "./States.tsx";

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

export default function ViewerPage() {
  const [link, setLink] = useState<LinkState>(() => readLink());
  const [catalog, setCatalog] = useState<StarRow[] | null>(null);
  const [segments, setSegments] = useState<SegmentRow[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<number | null>(null);
  const [view, setView] = useState<View>(HOME_VIEW);
  const [fontsReady, setFontsReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef(0);

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
  useEffect(() => {
    let live = true;
    document.fonts.ready
      .then(() => {
        if (live) setFontsReady(true);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  // Static catalog + line data (regenerate via `python -m starpy export-static-data`).
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

  const payload = link.kind === "ready" ? link.payload : null;
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
      animateView({ scale: 2.4, fx: fig.centroidX, fy: fig.centroidY });
    },
    [model, animateView],
  );

  const handleHoverFigure = useCallback((index: number | null) => {
    setHovered(index);
    setTooltip(index);
  }, []);

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "starpy-sky.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  const fullAppHref =
    link.kind === "ready" ? `${FULL_APP_URL}#s=${link.fragment}` : FULL_APP_URL;

  return (
    <div className="atlas-page">
      <header className="atlas-header">
        <div>
          <p className="font-display text-2xl leading-none">Starpy</p>
          <p className="mt-1 text-xs tracking-wide text-cream/55">
            A night-sky atlas moment, recomputed in your browser
          </p>
        </div>
        <nav className="flex items-center gap-2" aria-label="Poster actions">
          {link.kind === "ready" && (
            <button type="button" onClick={downloadPng} className="atlas-btn">
              Download PNG
            </button>
          )}
          <a className="atlas-btn-ghost" href={fullAppHref}>
            Open in full app
          </a>
        </nav>
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
                Star data could not be loaded ({dataError}). Regenerate it
                with <code className="atlas-code">python -m starpy
                export-static-data</code> and redeploy.
              </p>
            )}

            {model ? (
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
                  Charting the stars…
                </p>
              )
            )}
          </>
        )}
      </main>

      <footer className="atlas-footer">
        <p>
          Poster-grade preview drawn from{" "}
          <code className="atlas-code">catalog.json</code>. For fine print
          and vector exports, the full app waits.{" "}
          <a className="atlas-link" href={FULL_APP_URL}>
            starpy
          </a>
          {link.kind === "empty" && (
            <>
              {" "}·{" "}
              <a
                className="atlas-link"
                href={`#s=${SAMPLE_FRAGMENT}`}
              >
                sample sky
              </a>
            </>
          )}
        </p>
      </footer>
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
        {figure.starIndices.length} stars · brightest mag{" "}
        {figure.brightestMag.toFixed(1)}
      </p>
    </div>
  );
}
