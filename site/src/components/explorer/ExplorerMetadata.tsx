/**
 * The moment strip: place, local time and optional title. Expanded on load and
 * during activity, one line after 2.5 s idle, pinned on request. It never hides
 * and never touches the scene. Screen-reader text is the same in every mode;
 * the visual forms are hidden from it, so only sight sees the change.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { JSX, ReactNode } from "react";
import { t } from "../../i18n/index.ts";
import { Icon } from "../icons.tsx";
import { MetadataMachine, type MomentInput, formatMoment } from "../../lib/explorer/metadata.ts";

interface Props {
  moment: MomentInput;
  /** For tests; the page lets the component make its own. */
  machine?: MetadataMachine;
  /** Buttons that sit beside the pin, inside the strip. */
  children?: ReactNode;
}

/** Pointer, touch and keyboard (wheel counts as pointer). */
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "touchstart", "wheel", "keydown"] as const;

export default function ExplorerMetadata({ moment, machine: provided, children }: Props): JSX.Element {
  const [machine] = useState(() => provided ?? new MetadataMachine({ now: () => Date.now() }));
  const mode = useSyncExternalStore(
    (listener) => machine.subscribe(listener),
    () => machine.mode,
  );

  useEffect(() => {
    const onActivity = (): void => {
      machine.activity();
    };
    for (const type of ACTIVITY_EVENTS) document.addEventListener(type, onActivity, { passive: true });
    return () => {
      for (const type of ACTIVITY_EVENTS) document.removeEventListener(type, onActivity);
    };
  }, [machine]);

  // While expanded, wake once when the idle time is up; activity moves the deadline,
  // so a wake that comes early just waits for the rest.
  useEffect(() => {
    if (mode !== "expanded") return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = (): void => {
      const wait = machine.msUntilCompact();
      if (wait === null) return;
      timer = setTimeout(() => {
        if (!machine.tick()) arm();
      }, wait);
    };
    arm();
    return () => {
      clearTimeout(timer);
    };
  }, [machine, mode]);

  const text = formatMoment(moment);
  const pinned = mode === "pinned";

  return (
    <section className="explorer-moment" aria-label={t("explorer.moment.label")} data-mode={mode}>
      <p className="sr-only">{text.full}</p>
      <div className="explorer-moment-visual" aria-hidden="true">
        <div className="explorer-moment-full">
          <div>
            {text.title !== null && <p className="explorer-moment-title">{text.title}</p>}
            <p className="explorer-moment-place">{text.place ?? text.coords}</p>
            <p className="explorer-moment-time">{text.local}</p>
            {text.place !== null && <p className="explorer-moment-coords">{text.coords}</p>}
          </div>
        </div>
        <p className="explorer-moment-line">{text.compact}</p>
      </div>
      <button
        type="button"
        className="explorer-pin explorer-icon-button"
        aria-label={t("explorer.moment.pin")}
        aria-pressed={pinned}
        title={t("explorer.moment.pin")}
        onClick={() => {
          machine.togglePin();
        }}
      >
        <Icon name={pinned ? "lock-closed" : "lock-open"} />
      </button>
      {children}
    </section>
  );
}
