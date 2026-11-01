/**
 * Zoom and reset, as buttons.
 *
 * Drag and wheel are how a map is actually navigated, but they are invisible:
 * a visitor who lands on the page cannot tell that the poster moves at all.
 * These three are the affordance that says it does, and they are what makes
 * the same navigation reachable without a pointer.
 */
import { t } from "../i18n/index.ts";
import { Icon } from "./icons.tsx";
import { isHomeView, MAX_SCALE, MIN_SCALE, type View } from "../lib/view.ts";

interface Props {
  view: View;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function ViewControls({
  view,
  onZoomIn,
  onZoomOut,
  onReset,
}: Props) {
  const home = isHomeView(view);
  return (
    <div
      className="atlas-viewcontrols"
      role="group"
      aria-label={t("viewer.viewControls")}
    >
      <button
        type="button"
        className="atlas-btn-icon"
        aria-label={t("viewer.zoomOut")}
        title={t("viewer.zoomOut")}
        onClick={onZoomOut}
        disabled={view.scale <= MIN_SCALE}
      >
        <Icon name="zoom-out" />
      </button>
      <button
        type="button"
        className="atlas-btn-icon"
        aria-label={t("viewer.zoomIn")}
        title={t("viewer.zoomIn")}
        onClick={onZoomIn}
        disabled={view.scale >= MAX_SCALE}
      >
        <Icon name="zoom-in" />
      </button>
      <button
        type="button"
        className="atlas-btn-icon"
        aria-label={t("viewer.resetView")}
        title={t("viewer.resetView")}
        onClick={onReset}
        disabled={home}
      >
        <Icon name="reset" />
      </button>
    </div>
  );
}
