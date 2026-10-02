import { useMemo } from "react";
import type { Figure } from "../lib/skymodel.ts";
import { t } from "../i18n/index.ts";

interface Props {
  figures: Figure[];
  hovered: number | null;
  selected: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onReset: () => void;
}

export default function FiguresPanel({
  figures,
  hovered,
  selected,
  onHover,
  onSelect,
  onReset,
}: Props) {
  const sorted = useMemo(
    () => figures.map((f, i) => ({ f, i })).sort((a, b) => a.f.name.localeCompare(b.f.name)),
    [figures],
  );
  const active = selected ?? hovered;
  return (
    <section aria-label={t("figures.title")} className="atlas-panel">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl">{t("figures.legend")}</h2>
        {selected !== null && (
          <button
            type="button"
            onClick={onReset}
            className="atlas-link text-sm"
          >
            {t("figures.reset")}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-cream/60">
        {t("figures.subtitle", { count: figures.length })}
      </p>
      <ul className="mt-4 grid max-h-[28rem] grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {sorted.map(({ f, i }) => {
          const isActive = active === i;
          return (
            <li key={f.abbr}>
              <button
                type="button"
                onClick={() => {
                  onSelect(i);
                }}
                onMouseEnter={() => {
                  onHover(i);
                }}
                onMouseLeave={() => {
                  onHover(null);
                }}
                onFocus={() => {
                  onHover(i);
                }}
                onBlur={() => {
                  onHover(null);
                }}
                aria-pressed={selected === i}
                className={`atlas-figure ${isActive ? "atlas-figure-active" : ""}`}
              >
                <span className="font-display text-base leading-tight">
                  {f.name}
                </span>
                <span className="block text-xs text-cream/55">
                  {t("figures.stat", {
                    count: f.starIndices.length,
                    mag: f.brightestMag.toFixed(1),
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
