/** Layer switches. They go to the controller; only this panel's own copy is React state. */
import { useState } from "react";
import type { JSX, KeyboardEvent } from "react";
import { t } from "../../i18n/index.ts";
import type { ExplorerController } from "../../lib/explorer/controller.ts";
import type { PlanLayers } from "../../lib/explorer/layers.ts";
import type { BelowMode } from "../../lib/sky/payload.ts";

interface Props {
  controller: ExplorerController;
  onClose: () => void;
}

type FlagKey = "constellationLines" | "constellationLabels" | "horizon" | "cardinalDirections" | "equatorialGrid";

const FLAGS: readonly FlagKey[] = [
  "constellationLines",
  "constellationLabels",
  "horizon",
  "cardinalDirections",
  "equatorialGrid",
];

const BELOW: readonly BelowMode[] = ["dimmed", "hidden"];

export default function ExplorerLayers({ controller, onClose }: Props): JSX.Element {
  const [layers, setLayers] = useState<PlanLayers>(() => controller.getLayers());

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div className="explorer-layers" role="group" aria-label={t("explorer.layers.title")} onKeyDown={onKeyDown}>
      <div className="explorer-panel-head">
        <h2 className="explorer-panel-title">{t("explorer.layers.title")}</h2>
        <button type="button" className="atlas-btn-ghost" onClick={onClose}>
          {t("explorer.layers.close")}
        </button>
      </div>
      {FLAGS.map((key) => (
        <label key={key} className="atlas-form-check">
          <input
            type="checkbox"
            checked={layers[key]}
            onChange={(event) => {
              controller.setLayer(key, event.target.checked);
              setLayers(controller.getLayers());
            }}
          />
          <span>{t(`explorer.layers.${key}`)}</span>
        </label>
      ))}
      <div role="radiogroup" aria-label={t("explorer.layers.below")} className="explorer-radios">
        <p className="explorer-facts-title" aria-hidden="true">
          {t("explorer.layers.below")}
        </p>
        {BELOW.map((mode) => (
          <label key={mode} className="atlas-form-check">
            <input
              type="radio"
              name="explorer-below"
              checked={layers.below === mode}
              onChange={() => {
                controller.setLayer("below", mode);
                setLayers(controller.getLayers());
              }}
            />
            <span>{t(`explorer.layers.below.${mode}`)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
