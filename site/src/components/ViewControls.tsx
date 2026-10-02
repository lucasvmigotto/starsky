/**
 * Zoom and reset, as buttons.
 *
 * Drag and wheel are how a map is actually navigated, but they are invisible:
 * a visitor who lands on the page cannot tell that the poster moves at all.
 * These three are the affordance that says it does, and they are what makes
 * the same navigation reachable without a pointer.
 */
import { t } from "../i18n/index.ts";
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
        className="atlas-btn-subtle"
        onClick={onZoomOut}
        disabled={view.scale <= MIN_SCALE}
      >
        {t("viewer.zoomOut")}
      </button>
      <button
        type="button"
        className="atlas-btn-subtle"
        onClick={onZoomIn}
        disabled={view.scale >= MAX_SCALE}
      >
        {t("viewer.zoomIn")}
      </button>
      <button
        type="button"
        className="atlas-btn-subtle"
        onClick={onReset}
        disabled={home}
      >
        {t("viewer.resetView")}
      </button>
    </div>
  );
}
