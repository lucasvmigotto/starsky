/**
 * Floating map controls. It follows the controller only through its settled
 * event, and only for whether the zoom buttons are at a limit, so a moving sky
 * never renders it (FR-001). Buttons act on the controller directly.
 */
import { memo, useEffect, useRef, useState } from "react";
import type { JSX, RefObject } from "react";
import { t } from "../../i18n/index.ts";
import type { ExplorerController } from "../../lib/explorer/controller.ts";
import { FOV_MAX_DEG, FOV_MIN_DEG } from "../../lib/sky/camera.ts";

interface Props {
  controller: ExplorerController;
  searchOpen: boolean;
  layersOpen: boolean;
  inspectorOpen: boolean;
  onToggleSearch: () => void;
  onToggleLayers: () => void;
  onToggleInspector: () => void;
  /** Open the Poster Studio with this scene; the button shows only when given. */
  onCreatePoster?: () => void;
  searchRef?: RefObject<HTMLButtonElement | null>;
  layersRef?: RefObject<HTMLButtonElement | null>;
  inspectorRef?: RefObject<HTMLButtonElement | null>;
  inspectorId?: string;
}

function tip(label: string, key: string): string {
  return t("explorer.toolbar.shortcut", { label, key });
}

function ExplorerToolbar({
  controller,
  searchOpen,
  layersOpen,
  inspectorOpen,
  onToggleSearch,
  onToggleLayers,
  onToggleInspector,
  onCreatePoster,
  searchRef,
  layersRef,
  inspectorRef,
  inspectorId,
}: Props): JSX.Element {
  const [atMin, setAtMin] = useState(() => controller.getCamera().fovDeg <= FOV_MIN_DEG);
  const [atMax, setAtMax] = useState(() => controller.getCamera().fovDeg >= FOV_MAX_DEG);
  const zoomInRef = useRef<HTMLButtonElement | null>(null);
  const zoomOutRef = useRef<HTMLButtonElement | null>(null);

  const refresh = (): void => {
    const fov = controller.getCamera().fovDeg;
    setAtMin(fov <= FOV_MIN_DEG);
    setAtMax(fov >= FOV_MAX_DEG);
  };

  useEffect(() => {
    const off = controller.subscribe((change) => {
      if (change.kind === "settled") refresh();
    });
    return off;
    // `refresh` only reads the controller; the setters are stable.
  }, [controller]);

  const zoom = (steps: number, self: RefObject<HTMLButtonElement | null>, other: RefObject<HTMLButtonElement | null>): void => {
    controller.zoomBy(steps);
    const fov = controller.getCamera().fovDeg;
    // A button that disables itself would drop the keyboard's place; hand it to the other.
    const limit = steps > 0 ? fov <= FOV_MIN_DEG : fov >= FOV_MAX_DEG;
    if (limit && document.activeElement === self.current) other.current?.focus();
    refresh();
  };

  const zoomInLabel = t("explorer.toolbar.zoomIn");
  const zoomOutLabel = t("explorer.toolbar.zoomOut");
  const resetLabel = t("explorer.toolbar.reset");

  return (
    <div className="explorer-toolbar" role="toolbar" aria-label={t("explorer.toolbar.label")}>
      <button
        ref={zoomInRef}
        type="button"
        className="explorer-tool explorer-tool-icon"
        aria-label={zoomInLabel}
        title={tip(zoomInLabel, "+")}
        disabled={atMin}
        onClick={() => {
          zoom(1, zoomInRef, zoomOutRef);
        }}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        ref={zoomOutRef}
        type="button"
        className="explorer-tool explorer-tool-icon"
        aria-label={zoomOutLabel}
        title={tip(zoomOutLabel, "-")}
        disabled={atMax}
        onClick={() => {
          zoom(-1, zoomOutRef, zoomInRef);
        }}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className="explorer-tool explorer-tool-text"
        title={tip(resetLabel, "0")}
        onClick={() => {
          controller.reset();
          refresh();
        }}
      >
        {resetLabel}
      </button>
      <button
        ref={layersRef}
        type="button"
        className="explorer-tool explorer-tool-text"
        title={t("explorer.toolbar.layers")}
        aria-expanded={layersOpen}
        aria-haspopup="true"
        onClick={onToggleLayers}
      >
        {t("explorer.toolbar.layers")}
      </button>
      <button
        ref={searchRef}
        type="button"
        className="explorer-tool explorer-tool-text"
        title={t("explorer.toolbar.search")}
        aria-expanded={searchOpen}
        aria-haspopup="true"
        onClick={onToggleSearch}
      >
        {t("explorer.toolbar.search")}
      </button>
      <button
        ref={inspectorRef}
        type="button"
        className="explorer-tool explorer-tool-text explorer-tool-inspector"
        title={t("explorer.toolbar.inspector")}
        aria-expanded={inspectorOpen}
        aria-controls={inspectorId}
        onClick={onToggleInspector}
      >
        {t("explorer.toolbar.inspector")}
      </button>
      {onCreatePoster && (
        <button
          type="button"
          className="explorer-tool explorer-tool-text"
          title={t("explorer.toolbar.poster")}
          onClick={onCreatePoster}
        >
          {t("explorer.toolbar.poster")}
        </button>
      )}
    </div>
  );
}

export default memo(ExplorerToolbar);
