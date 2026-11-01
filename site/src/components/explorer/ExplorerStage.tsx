/**
 * The Explorer once the sky is loaded: the canvas with its strip, toolbar,
 * popovers and inspector around it. UI-only state (which panel is open) lives
 * here in a reducer; everything that moves lives in the controller, and the
 * link follows it without React (history.replaceState on settle).
 */
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { JSX, KeyboardEvent } from "react";
import type { ExplorerController } from "../../lib/explorer/controller.ts";
import { absoluteLink, bindLink, currentHash } from "../../lib/explorer/link.ts";
import { MetadataMachine } from "../../lib/explorer/metadata.ts";
import { createPosterHash } from "../../lib/scene/handoff.ts";
import type { ExplorerPayload } from "../../lib/sky/payload.ts";
import type { SkyScene } from "../../lib/sky/scene.ts";
import ExplorerCanvas from "./ExplorerCanvas.tsx";
import ExplorerCopyLink from "./ExplorerCopyLink.tsx";
import ExplorerInspector, { INSPECTOR_BODY_ID } from "./ExplorerInspector.tsx";
import ExplorerLayers from "./ExplorerLayers.tsx";
import ExplorerMetadata from "./ExplorerMetadata.tsx";
import ExplorerPanelTab from "./ExplorerPanelTab.tsx";
import ExplorerSearch from "./ExplorerSearch.tsx";
import ExplorerToolbar from "./ExplorerToolbar.tsx";
import ExplorerTooltip from "./ExplorerTooltip.tsx";
import useChrome from "./useChrome.ts";

interface Props {
  scene: SkyScene;
  payload: ExplorerPayload;
}

interface Panels {
  search: boolean;
  layers: boolean;
  inspector: boolean;
}

type PanelAction =
  | { type: "toggle"; panel: keyof Panels }
  | { type: "open" | "close"; panel: keyof Panels };

/** Search and layers share one popover slot; the inspector is independent. */
function panelsReducer(state: Panels, action: PanelAction): Panels {
  const open = action.type === "toggle" ? !state[action.panel] : action.type === "open";
  if (action.panel === "inspector") return { ...state, inspector: open };
  return { ...state, search: false, layers: false, [action.panel]: open };
}

/** The same query that turns the inspector into a bottom sheet in the CSS. */
const SHEET_QUERY = "(max-width: 47.99rem), (max-height: 32rem)";

function sheetLayout(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(SHEET_QUERY).matches;
}

/** How much of the map's right side the open side panel covers; 0 for the sheet. */
function panelInset(): number {
  if (sheetLayout()) return 0;
  const panel = document.querySelector<HTMLElement>('.explorer-inspector[data-open="true"]');
  return panel ? panel.getBoundingClientRect().width : 0;
}

export default function ExplorerStage({ scene, payload }: Props): JSX.Element {
  const [controller, setController] = useState<ExplorerController | null>(null);
  const [selection, setSelection] = useState<string | null>(payload.sel);
  const [panels, dispatch] = useReducer(panelsReducer, {
    search: false,
    layers: false,
    inspector: payload.sel !== null && !sheetLayout(),
  });
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const searchButton = useRef<HTMLButtonElement | null>(null);
  const layersButton = useRef<HTMLButtonElement | null>(null);
  const tabButton = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const layersPanel = useRef<HTMLDivElement | null>(null);
  const [metadata] = useState(() => new MetadataMachine({ now: () => Date.now() }));
  const pinned = useSyncExternalStore(
    (listener) => metadata.subscribe(listener),
    () => metadata.mode === "pinned",
  );
  const chrome = useChrome({ rootRef: layoutRef, popoverOpen: panels.search || panels.layers, pinned });

  useEffect(() => {
    if (!controller) return;
    setSelection(controller.getSelection());
    const off = controller.subscribe((change) => {
      if (change.kind !== "selection") return;
      setSelection(change.selection);
      // On a sheet the selection would sit under the open panel; the handle shows its name instead.
      if (change.selection !== null && !sheetLayout()) dispatch({ type: "open", panel: "inspector" });
    });
    const unbind = bindLink(controller, payload, (hash) => {
      window.history.replaceState(window.history.state, "", hash);
    });
    return () => {
      off();
      unbind();
    };
  }, [controller, payload]);

  useEffect(() => {
    if (panels.search) searchInput.current?.focus();
  }, [panels.search]);

  useEffect(() => {
    if (panels.layers) layersPanel.current?.querySelector("input")?.focus();
  }, [panels.layers]);

  const focusCanvas = useCallback((): void => {
    canvasRef.current?.focus();
  }, []);

  const closeSearch = useCallback((): void => {
    dispatch({ type: "close", panel: "search" });
    searchButton.current?.focus();
  }, []);

  const closeLayers = useCallback((): void => {
    dispatch({ type: "close", panel: "layers" });
    layersButton.current?.focus();
  }, []);

  const closeInspector = useCallback((): void => {
    dispatch({ type: "close", panel: "inspector" });
    const handle = layoutRef.current?.querySelector<HTMLElement>(".explorer-sheet-handle");
    (sheetLayout() ? handle : tabButton.current)?.focus();
  }, []);

  const toggleSearch = useCallback((): void => {
    dispatch({ type: "toggle", panel: "search" });
  }, []);
  const toggleLayers = useCallback((): void => {
    dispatch({ type: "toggle", panel: "layers" });
  }, []);
  const toggleInspector = useCallback((): void => {
    dispatch({ type: "toggle", panel: "inspector" });
  }, []);

  const choose = useCallback(
    (id: string): void => {
      if (!controller) return;
      controller.select(id);
      controller.centerOn(id);
    },
    [controller],
  );

  const chooseFromSearch = useCallback(
    (id: string): void => {
      choose(id);
      dispatch({ type: "close", panel: "search" });
      focusCanvas();
    },
    [choose, focusCanvas],
  );

  const center = useCallback((): void => {
    const id = controller?.getSelection();
    if (controller && id) controller.centerOn(id);
  }, [controller]);

  const clear = useCallback((): void => {
    controller?.select(null);
    focusCanvas();
  }, [controller, focusCanvas]);

  /** Escape closes search or layers first, then clears the selection. */
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Escape") return;
    if (panels.search) closeSearch();
    else if (panels.layers) closeLayers();
    else if (controller?.getSelection() != null) clear();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Leave for the Studio with this scene; the camera is remembered for the way back. */
  const createPoster = useCallback((): void => {
    if (!controller) return;
    window.location.hash = createPosterHash(payload, controller.getCamera());
  }, [controller, payload]);

  const moment = {
    lat: payload.lat,
    lon: payload.lon,
    place: payload.place,
    title: payload.title,
    when_utc: payload.when_utc,
    tz: payload.tz,
  };

  return (
    <div
      className="explorer-stage-inner"
      ref={layoutRef}
      data-chrome={chrome.state}
      onKeyDownCapture={onKeyDownCapture}
    >
      <div className="explorer-view">
        <ExplorerCanvas
          scene={scene}
          payload={payload}
          onController={setController}
          canvasRef={canvasRef}
          wakesOnly={chrome.hiddenNow}
        />
        {controller && (
          <>
            <ExplorerTooltip
              controller={controller}
              scene={scene}
              canvas={canvasRef.current}
              rightInset={panelInset}
            />
            <div className="explorer-top">
              <ExplorerMetadata moment={moment} machine={metadata}>
                <ExplorerCopyLink getLink={() => absoluteLink(currentHash(controller, payload), window.location)} />
              </ExplorerMetadata>
            </div>
            <div className="explorer-dock">
              <ExplorerToolbar
                controller={controller}
                searchOpen={panels.search}
                layersOpen={panels.layers}
                onToggleSearch={toggleSearch}
                onToggleLayers={toggleLayers}
                onCreatePoster={createPoster}
                searchRef={searchButton}
                layersRef={layersButton}
              />
              {panels.search && (
                <div className="explorer-popover">
                  <ExplorerSearch
                    scene={scene}
                    magLimit={payload.mag}
                    onChoose={chooseFromSearch}
                    onClose={closeSearch}
                    inputRef={searchInput}
                  />
                </div>
              )}
              {panels.layers && (
                <div className="explorer-popover" ref={layersPanel}>
                  <ExplorerLayers controller={controller} onClose={closeLayers} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {controller && (
        <ExplorerInspector
          scene={scene}
          view={controller.view}
          selection={selection}
          hover={controller.hover}
          open={panels.inspector}
          onChoose={choose}
          onCenter={center}
          onClear={clear}
          onToggle={toggleInspector}
          onClose={closeInspector}
        />
      )}
      {controller && (
        <ExplorerPanelTab
          open={panels.inspector}
          controls={INSPECTOR_BODY_ID}
          onToggle={toggleInspector}
          buttonRef={tabButton}
        />
      )}
    </div>
  );
}
