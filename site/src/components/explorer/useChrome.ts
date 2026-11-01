/**
 * Wires the chrome machine to the page: what counts as activity, what holds the
 * controls open, and the one timer that hides them. React sees only the state.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { type ChromeState, ChromeMachine } from "../../lib/explorer/chrome.ts";

/** Pointer, touch, wheel and keyboard, as for the moment strip. */
const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "wheel", "touchstart", "keydown"] as const;
const POINTER_END_EVENTS = ["pointerup", "pointercancel"] as const;

/** The controls and panels that hide; the map and the moment line are not among them. */
const CONTROLS = ".explorer-dock, .explorer-inspector, .explorer-tab, .explorer-moment button";

interface Options {
  rootRef: RefObject<HTMLElement | null>;
  /** Search or layers is open. */
  popoverOpen: boolean;
  /** The moment strip is pinned. */
  pinned: boolean;
  /** For tests. */
  idleMs?: number;
}

export interface Chrome {
  state: ChromeState;
  /** True while the controls are hidden: read it when a touch lands, before it counts as activity. */
  hiddenNow: () => boolean;
}

function inControls(node: EventTarget | null): boolean {
  return node instanceof Element && node.closest(CONTROLS) !== null;
}

/** Keyboard focus holds the controls; a mouse click's focus does not. */
function focusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

export default function useChrome({ rootRef, popoverOpen, pinned, idleMs }: Options): Chrome {
  const [machine] = useState(() => new ChromeMachine({ now: () => Date.now(), idleMs }));
  const state = useSyncExternalStore(
    (listener) => machine.subscribe(listener),
    () => machine.state,
  );
  const hiddenNow = useRef(() => machine.state === "hidden").current;
  const arm = useRef<() => void>(() => undefined);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // One timer at the deadline. Activity only moves the deadline, so a wake that
    // comes early checks the time left and waits again.
    const schedule = (): void => {
      if (timer !== null) return;
      const wait = machine.msUntilHide();
      if (wait === null) return;
      timer = setTimeout(() => {
        timer = null;
        machine.tick();
        schedule();
      }, wait);
    };
    arm.current = schedule;
    const activity = (): void => {
      machine.activity();
      schedule();
    };
    const hold = (kind: Parameters<ChromeMachine["hold"]>[0], on: boolean): void => {
      machine.hold(kind, on);
      schedule();
    };

    for (const type of ACTIVITY_EVENTS) document.addEventListener(type, activity, { passive: true });
    const onDown = (): void => {
      hold("drag", true);
    };
    const onUp = (): void => {
      hold("drag", false);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    for (const type of POINTER_END_EVENTS) document.addEventListener(type, onUp, { passive: true });

    const root = rootRef.current;
    const onOver = (event: Event): void => {
      hold("pointer", inControls(event.target));
    };
    const onLeave = (): void => {
      hold("pointer", false);
    };
    const onFocusIn = (event: Event): void => {
      if (!inControls(event.target)) return;
      activity();
      hold("focus", event.target instanceof Element && focusVisible(event.target));
    };
    const onFocusOut = (event: FocusEvent): void => {
      if (!inControls(event.relatedTarget)) hold("focus", false);
    };
    root?.addEventListener("pointerover", onOver, { passive: true });
    root?.addEventListener("pointerleave", onLeave, { passive: true });
    root?.addEventListener("focusin", onFocusIn);
    root?.addEventListener("focusout", onFocusOut);

    return () => {
      if (timer !== null) clearTimeout(timer);
      for (const type of ACTIVITY_EVENTS) document.removeEventListener(type, activity);
      document.removeEventListener("pointerdown", onDown);
      for (const type of POINTER_END_EVENTS) document.removeEventListener(type, onUp);
      root?.removeEventListener("pointerover", onOver);
      root?.removeEventListener("pointerleave", onLeave);
      root?.removeEventListener("focusin", onFocusIn);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [machine, rootRef]);

  useEffect(() => {
    machine.hold("popover", popoverOpen);
    arm.current();
  }, [machine, popoverOpen]);

  useEffect(() => {
    machine.hold("pinned", pinned);
    arm.current();
  }, [machine, pinned]);

  return { state, hiddenNow };
}
