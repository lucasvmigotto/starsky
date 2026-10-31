/**
 * The page behind `#e=`: reads the link, loads the sky data, hands both to the
 * canvas. Everything it shows besides the canvas is a state: loading, a link
 * that cannot be read, or star data that did not load.
 */
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { t } from "../../i18n/index.ts";
import {
  ExplorerDecodeError,
  type ExplorerPayload,
  decodeExplorer,
  explorerFragmentFromHash,
} from "../../lib/sky/payload.ts";
import { type SkyScene, prepareScene } from "../../lib/sky/scene.ts";
import type { SegmentRow } from "../../lib/skymodel.ts";
import ExplorerCanvas from "./ExplorerCanvas.tsx";

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${String(res.status)} for ${url}`);
  return (await res.json()) as T;
}

let sceneLoad: Promise<SkyScene> | null = null;

/** One load per page view; a failure is not kept, so a reload retries. */
export function loadScene(): Promise<SkyScene> {
  sceneLoad ??= Promise.all([
    fetchJson<{ stars: [number, number, number, number][] }>(`${DATA_BASE}catalog.json`),
    fetchJson<{ segments: SegmentRow[] }>(`${DATA_BASE}constellations.json`),
    // Names are an extra: without them stars fall back to their HIP number.
    fetchJson<{ names: [number, string][] }>(`${DATA_BASE}names.json`).then(
      (data) => data.names,
      (): [number, string][] => [],
    ),
  ]).then(([catalog, constellations, names]) =>
    prepareScene(
      catalog.stars.map(([hip, raDeg, decDeg, mag]) => ({ hip, raDeg, decDeg, mag })),
      constellations.segments,
      names,
    ),
  );
  sceneLoad.catch(() => {
    sceneLoad = null;
  });
  return sceneLoad;
}

/** For tests: forget the loaded sky. */
export function resetSceneCache(): void {
  sceneLoad = null;
}

type LinkState =
  | { kind: "ready"; payload: ExplorerPayload }
  | { kind: "invalid"; detail: string };

function readLink(): LinkState {
  const fragment = explorerFragmentFromHash(window.location.hash);
  if (fragment === null) return { kind: "invalid", detail: "empty link" };
  try {
    return { kind: "ready", payload: decodeExplorer(fragment) };
  } catch (error) {
    const detail =
      error instanceof ExplorerDecodeError
        ? error.message.replace("Invalid explorer payload: ", "")
        : "unreadable payload";
    return { kind: "invalid", detail };
  }
}

function BackLink(): JSX.Element {
  return (
    <a className="atlas-btn" href="#/">
      {t("explorer.back")}
    </a>
  );
}

export default function ExplorerPage(): JSX.Element {
  const [link] = useState<LinkState>(readLink);
  const [scene, setScene] = useState<SkyScene | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (link.kind !== "ready") return;
    let live = true;
    loadScene().then(
      (loaded) => {
        if (live) setScene(loaded);
      },
      (error: unknown) => {
        if (live) setDataError(error instanceof Error ? error.message : "could not load data");
      },
    );
    return () => {
      live = false;
    };
  }, [link]);

  if (link.kind === "invalid") {
    return (
      <main className="explorer-state">
        <div className="atlas-empty">
          <h1 className="font-display text-3xl">{t("invalid.title")}</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70" role="alert">
            {t("invalid.body", { detail: link.detail })}
          </p>
          <div className="mt-6 flex justify-center">
            <BackLink />
          </div>
        </div>
      </main>
    );
  }

  if (dataError !== null) {
    return (
      <main className="explorer-state">
        <div className="atlas-empty">
          <h1 className="font-display text-3xl">{t("dataError.title")}</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70" role="alert">
            {t("dataError.bodyPrefix", { detail: dataError })}
            <code className="atlas-code">{t("dataError.command")}</code>
            {t("dataError.bodySuffix")}
          </p>
          <div className="mt-6 flex justify-center">
            <BackLink />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="explorer-stage">
      <h1 className="sr-only">{t("explorer.heading")}</h1>
      {scene ? (
        <ExplorerCanvas scene={scene} payload={link.payload} />
      ) : (
        <p className="atlas-loading" role="status">
          {t("explorer.loading")}
        </p>
      )}
    </main>
  );
}
