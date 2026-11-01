/**
 * The poster-only controls, shared by the landing form and the Studio. The ids
 * and names are the landing's own, so the share encoding and the tests are
 * unaffected. Appearance pairs related controls (projection with shape, fisheye
 * with separation, glow with its intensity); the rarely changed ones (lines,
 * labels, limiting magnitude) sit in one collapsed Advanced disclosure. The
 * Studio asks for Appearance open where the landing keeps it collapsed.
 */
import type { ReactNode } from "react";
import { t } from "../../i18n/index.ts";
import type { Projection, Shape } from "../../lib/share.ts";

export interface PosterFieldValues {
  projection: Projection;
  fisheyeStrength: number;
  minSeparation: number;
  magnitudeLimit: number;
  glow: boolean;
  glowIntensity: number;
  constellations: boolean;
  constellationLabels: boolean;
  shape: Shape;
  title: string;
}

interface Props {
  /** Prefix of every control's id (`landing-projection`, ...). */
  idPrefix: string;
  legends: { appearance: string; advanced: string };
  titleLabel: string;
  titlePlaceholder?: string;
  /** A problem with the title, shown beside it. */
  titleError?: string | null;
  /** `<details>` sections (the landing) or open fieldsets (the Studio). */
  collapsible?: boolean;
  value: PosterFieldValues;
  onChange: (patch: Partial<PosterFieldValues>) => void;
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  decimals,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="atlas-form-field">
      <div className="atlas-form-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="atlas-form-value">
          {value.toFixed(decimals)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="atlas-form-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
      />
    </div>
  );
}

function Section({
  legend,
  collapsible,
  children,
}: {
  legend: string;
  collapsible: boolean;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <details className="atlas-form-details">
        <summary>{legend}</summary>
        {children}
      </details>
    );
  }
  return (
    <fieldset className="atlas-form-group">
      <legend className="atlas-form-legend">{legend}</legend>
      {children}
    </fieldset>
  );
}

export default function PosterFields({
  idPrefix,
  legends,
  titleLabel,
  titlePlaceholder,
  titleError = null,
  collapsible = true,
  value,
  onChange,
}: Props) {
  const titleErrorId = `${idPrefix}-title-error`;
  return (
    <>
      <Section legend={legends.appearance} collapsible={collapsible}>
        <div className="atlas-form-pair">
          <div className="atlas-form-field">
            <label htmlFor={`${idPrefix}-projection`}>Projection</label>
            <select
              id={`${idPrefix}-projection`}
              className="atlas-form-input"
              value={value.projection}
              onChange={(e) => {
                onChange({ projection: e.target.value as Projection });
              }}
            >
              <option value="stereographic">stereographic</option>
              <option value="fisheye">fisheye</option>
            </select>
          </div>
          <div className="atlas-form-field">
            <span className="atlas-form-label" id={`${idPrefix}-shape-label`}>
              Shape
            </span>
            <div className="atlas-segmented" role="radiogroup" aria-labelledby={`${idPrefix}-shape-label`}>
              {(["circle", "square"] as const).map((s) => (
                <label key={s} className="atlas-segment">
                  <input
                    type="radio"
                    name="shape"
                    value={s}
                    checked={value.shape === s}
                    onChange={() => {
                      onChange({ shape: s });
                    }}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="atlas-form-pair">
          <Slider
            id={`${idPrefix}-fisheye`}
            label={t("landing.render.fisheye")}
            value={value.fisheyeStrength}
            min={0.1}
            max={3.0}
            step={0.1}
            decimals={1}
            onChange={(fisheyeStrength) => {
              onChange({ fisheyeStrength });
            }}
          />
          <Slider
            id={`${idPrefix}-separation`}
            label={t("landing.render.separation")}
            value={value.minSeparation}
            min={0.0}
            max={0.05}
            step={0.001}
            decimals={3}
            onChange={(minSeparation) => {
              onChange({ minSeparation });
            }}
          />
        </div>
        <div className="atlas-form-pair atlas-form-pair-flow">
          <label className="atlas-form-check">
            <input
              type="checkbox"
              checked={value.glow}
              onChange={(e) => {
                onChange({ glow: e.target.checked });
              }}
            />
            Glow
          </label>
          <Slider
            id={`${idPrefix}-glow`}
            label={t("landing.render.glow")}
            value={value.glowIntensity}
            min={0.0}
            max={3.0}
            step={0.1}
            decimals={1}
            onChange={(glowIntensity) => {
              onChange({ glowIntensity });
            }}
          />
        </div>
        <div className="atlas-form-field">
          <label htmlFor={`${idPrefix}-title`}>{titleLabel}</label>
          <input
            id={`${idPrefix}-title`}
            type="text"
            className="atlas-form-input"
            value={value.title}
            placeholder={titlePlaceholder}
            aria-invalid={titleError === null ? undefined : true}
            aria-describedby={titleError === null ? undefined : titleErrorId}
            onChange={(e) => {
              onChange({ title: e.target.value });
            }}
            autoComplete="off"
          />
          {titleError !== null && (
            <p id={titleErrorId} role="alert" className="atlas-form-error">
              {titleError}
            </p>
          )}
        </div>
      </Section>

      <details className="atlas-form-details">
        <summary>{legends.advanced}</summary>
        <div className="atlas-form-check-row">
          <label className="atlas-form-check">
            <input
              type="checkbox"
              checked={value.constellations}
              onChange={(e) => {
                onChange({ constellations: e.target.checked });
              }}
            />
            {t("landing.render.lines")}
          </label>
          <label className="atlas-form-check">
            <input
              type="checkbox"
              checked={value.constellationLabels}
              onChange={(e) => {
                onChange({ constellationLabels: e.target.checked });
              }}
            />
            {t("landing.render.labels")}
          </label>
        </div>
        <Slider
          id={`${idPrefix}-mag`}
          label={t("landing.render.magnitude")}
          value={value.magnitudeLimit}
          min={1.0}
          max={7.0}
          step={0.1}
          decimals={1}
          onChange={(magnitudeLimit) => {
            onChange({ magnitudeLimit });
          }}
        />
      </details>
    </>
  );
}
