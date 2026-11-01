/**
 * The inspector: what the selection is, as catalog facts and as values derived
 * for this place and moment, plus the constellation list. A right panel on wide
 * screens, a bottom sheet on narrow ones (the layout is CSS; this is the DOM).
 * It takes the selection as a prop, so a camera move never reaches it.
 */
import { memo, useEffect, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";
import { t } from "../../i18n/index.ts";
import { Icon } from "../icons.tsx";
import {
  type ConstellationDetail,
  type GroupedConstellation,
  type StarDetail,
  describeConstellation,
  describeStar,
  groupConstellations,
} from "../../lib/explorer/inspect.ts";
import type { ObserverView } from "../../lib/explorer/observerView.ts";
import type { SkyScene } from "../../lib/sky/scene.ts";
import { formatDegrees, formatMagnitude } from "./format.ts";

export const INSPECTOR_BODY_ID = "explorer-inspector-body";

interface Props {
  scene: SkyScene;
  view: ObserverView;
  selection: string | null;
  open: boolean;
  /** Select and center. */
  onChoose: (id: string) => void;
  onCenter: () => void;
  onClear: () => void;
  onToggle: () => void;
  onClose: () => void;
}

function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="explorer-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Facts({
  heading,
  id,
  note,
  children,
}: {
  heading: string;
  id: string;
  note?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div role="group" aria-labelledby={id} className="explorer-facts">
      <h3 id={id} className="explorer-facts-title">
        {heading}
      </h3>
      <dl>{children}</dl>
      {note !== undefined && <p className="explorer-note">{note}</p>}
    </div>
  );
}

function horizonText(status: "above" | "below"): string {
  return t(status === "above" ? "explorer.inspector.horizon.above" : "explorer.inspector.horizon.below");
}

function StarFacts({ star, onChoose }: { star: StarDetail; onChoose: (id: string) => void }): JSX.Element {
  return (
    <>
      <Facts heading={t("explorer.inspector.catalog")} id="explorer-facts-catalog">
        {star.name !== null && <Fact label={t("explorer.inspector.name")}>{star.name}</Fact>}
        <Fact label={t("explorer.inspector.hip")}>{star.hip}</Fact>
        <Fact label={t("explorer.inspector.magnitude")}>{formatMagnitude(star.mag)}</Fact>
        <Fact label={t("explorer.inspector.ra")}>{formatDegrees(star.raDeg, 4)}</Fact>
        <Fact label={t("explorer.inspector.dec")}>{formatDegrees(star.decDeg, 4)}</Fact>
      </Facts>
      <Facts
        heading={t("explorer.inspector.derived")}
        id="explorer-facts-derived"
        note={t("explorer.inspector.precision")}
      >
        <Fact label={t("explorer.inspector.horizon")}>{horizonText(star.horizon)}</Fact>
        <Fact label={t("explorer.inspector.altitude")}>
          {t("explorer.inspector.approximate", { value: formatDegrees(star.altDeg, 1) })}
        </Fact>
        <Fact label={t("explorer.inspector.azimuth")}>
          {t("explorer.inspector.approximate", { value: formatDegrees(star.azDeg, 1) })}
        </Fact>
      </Facts>
      {star.figures.length > 0 && (
        <ul className="explorer-figures">
          {star.figures.map((figure) => (
            <li key={figure.id}>
              <button
                type="button"
                className="explorer-link"
                onClick={() => {
                  onChoose(figure.id);
                }}
              >
                {t("explorer.inspector.figureOf", { name: figure.name })}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ConstellationFacts({ con }: { con: ConstellationDetail }): JSX.Element {
  return (
    <>
      <Facts heading={t("explorer.inspector.catalog")} id="explorer-facts-catalog">
        <Fact label={t("explorer.inspector.abbr")}>{con.abbr}</Fact>
        <Fact label={t("explorer.inspector.starCount")}>{con.starCount}</Fact>
        <Fact label={t("explorer.inspector.brightest")}>
          {t("explorer.inspector.brightestValue", {
            name: con.brightest.title,
            mag: formatMagnitude(con.brightest.mag),
          })}
        </Fact>
      </Facts>
      <Facts heading={t("explorer.inspector.derived")} id="explorer-facts-derived">
        <Fact label={t("explorer.inspector.aboveCount")}>
          {t("explorer.inspector.aboveValue", { above: con.aboveCount, total: con.starCount })}
        </Fact>
      </Facts>
    </>
  );
}

interface GroupProps {
  titleId: string;
  heading: string;
  items: readonly GroupedConstellation[];
  open: boolean;
  selection: string | null;
  onToggle: (open: boolean) => void;
  onChoose: (id: string) => void;
}

/** One side of the horizon: a native disclosure, so it needs no script to open or close. */
function ConstellationGroup({ titleId, heading, items, open, selection, onToggle, onChoose }: GroupProps): JSX.Element {
  return (
    <details
      className="explorer-group"
      open={open}
      onToggle={(event) => {
        onToggle(event.currentTarget.open);
      }}
    >
      <summary id={titleId} className="explorer-group-summary">
        {heading}
      </summary>
      <ul className="explorer-list" aria-labelledby={titleId}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="explorer-list-item"
              aria-current={item.id === selection ? "true" : undefined}
              onClick={() => {
                onChoose(item.id);
              }}
            >
              <span>{item.name}</span>
              {item.partly && <span className="sr-only"> {t("explorer.list.partly")}</span>}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ExplorerInspector({
  scene,
  view,
  selection,
  open,
  onChoose,
  onCenter,
  onClear,
  onToggle,
  onClose,
}: Props): JSX.Element {
  const groups = useMemo(() => groupConstellations(scene, view), [scene, view]);
  const [aboveOpen, setAboveOpen] = useState(true);
  const [belowOpen, setBelowOpen] = useState(false);
  const selectedBelow = selection !== null && groups.below.some((item) => item.id === selection);
  // A selection in the closed group would otherwise be invisible in the list.
  useEffect(() => {
    if (selectedBelow) setBelowOpen(true);
  }, [selectedBelow, selection]);
  const detail = useMemo(() => {
    if (selection === null) return null;
    return describeStar(scene, view.ctx, selection) ?? describeConstellation(scene, view, selection);
  }, [scene, view, selection]);
  const title = detail === null ? t("explorer.inspector.label") : detail.kind === "star" ? detail.title : detail.name;

  return (
    <aside className="explorer-inspector" aria-label={t("explorer.inspector.label")} data-open={open}>
      <button
        type="button"
        className="explorer-sheet-handle"
        aria-expanded={open}
        aria-controls={INSPECTOR_BODY_ID}
        onClick={onToggle}
      >
        <span>{t(open ? "explorer.inspector.collapse" : "explorer.inspector.expand")}</span>
        {detail !== null && <span className="explorer-sheet-title">{title}</span>}
      </button>
      <div id={INSPECTOR_BODY_ID} className="explorer-inspector-body" hidden={!open}>
        <div className="explorer-inspector-head">
          <div>
            {detail !== null && (
              <p className="explorer-kind">
                {t(detail.kind === "star" ? "explorer.kind.star" : "explorer.kind.constellation")}
              </p>
            )}
            <h2 className="explorer-inspector-title">{title}</h2>
          </div>
          <button
            type="button"
            className="explorer-close explorer-icon-button"
            aria-label={t("explorer.inspector.close")}
            title={t("explorer.inspector.close")}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {detail === null ? (
          <p className="explorer-note">{t("explorer.inspector.empty")}</p>
        ) : (
          <>
            {detail.kind === "star" ? (
              <StarFacts star={detail} onChoose={onChoose} />
            ) : (
              <ConstellationFacts con={detail} />
            )}
            <div className="explorer-actions">
              <button type="button" className="atlas-btn-ghost explorer-action" onClick={onCenter}>
                {t("explorer.inspector.center")}
              </button>
              <button type="button" className="atlas-btn-ghost explorer-action" onClick={onClear}>
                {t("explorer.inspector.clear")}
              </button>
            </div>
          </>
        )}
        <h3 id="explorer-list-title" className="explorer-facts-title">
          {t("explorer.list.title")}
        </h3>
        <ConstellationGroup
          titleId="explorer-list-above"
          heading={t("explorer.list.above", { count: groups.above.length })}
          items={groups.above}
          open={aboveOpen}
          selection={selection}
          onToggle={setAboveOpen}
          onChoose={onChoose}
        />
        <ConstellationGroup
          titleId="explorer-list-below"
          heading={t("explorer.list.below", { count: groups.below.length })}
          items={groups.below}
          open={belowOpen}
          selection={selection}
          onToggle={setBelowOpen}
          onChoose={onChoose}
        />
      </div>
    </aside>
  );
}

export default memo(ExplorerInspector);
