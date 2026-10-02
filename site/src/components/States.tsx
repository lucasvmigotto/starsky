/**
 * The Viewer's non-ready states.
 *
 * Every string comes from the catalogue by key (000-design-system T027), and the
 * random-sky action is one phrase in every state (T023, vision D10) — it used to
 * be "Load a random sky" in two places and "Load a random sky instead" in two
 * others, which reads as two different actions to anyone new.
 */
import type { JSX, ReactNode } from "react";
import { fragmentFromHash } from "../lib/share.ts";
import { randomSampleFragment } from "../lib/site.ts";
import { t } from "../i18n/index.ts";

function goToSample(): void {
  window.location.hash = `#s=${randomSampleFragment(fragmentFromHash(window.location.hash))}`;
}

/** The shared shape: a heading, an explanation, and one way forward. */
function State({
  title,
  body,
}: {
  title: string;
  body: ReactNode;
}): JSX.Element {
  return (
    <div className="atlas-empty">
      <p className="font-display text-3xl">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
        {body}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={goToSample} className="atlas-btn">
          {t("viewer.randomSky")}
        </button>
      </div>
    </div>
  );
}

export function EmptyState(): JSX.Element {
  return (
    <State
      title={t("empty.title")}
      body={
        <>
          {t("empty.bodyPrefix")}
          <code className="atlas-code">#s=…</code>
          {t("empty.bodySuffix")}
        </>
      }
    />
  );
}

export function LegacyState(): JSX.Element {
  return (
    <State title={t("legacy.title")} body={t("legacy.body")} />
  );
}

export function InvalidState({ detail }: { detail: string }): JSX.Element {
  return (
    <State
      title={t("invalid.title")}
      body={t("invalid.body", { detail })}
    />
  );
}