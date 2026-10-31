/**
 * Whether the Explorer's controls are showing, as a small state machine with an
 * injected clock (like MetadataMachine). The page decides what counts as
 * activity and what holds the controls open; this module only keeps time.
 */

export type ChromeState = "visible" | "hidden";

/** What keeps the controls on screen however long nothing else happens. */
export type ChromeHold = "popover" | "focus" | "pointer" | "pinned" | "drag";

/** The controls hide this long after the last activity. */
export const CHROME_IDLE_MS = 4000;

export interface ChromeOptions {
  now: () => number;
  idleMs?: number;
}

export class ChromeMachine {
  private current: ChromeState = "hidden";
  private lastActivity = 0;
  private readonly held = new Set<ChromeHold>();
  private readonly now: () => number;
  private readonly idleMs: number;
  private readonly listeners = new Set<() => void>();

  constructor(options: ChromeOptions) {
    this.now = options.now;
    this.idleMs = options.idleMs ?? CHROME_IDLE_MS;
  }

  get state(): ChromeState {
    return this.current;
  }

  /** Returns true when the controls came back. */
  activity(): boolean {
    this.lastActivity = this.now();
    return this.set("visible");
  }

  /**
   * Take hold of the controls, or let go. Either counts as activity, so
   * releasing a hold restarts the timer. Returns true when the state changed.
   */
  hold(kind: ChromeHold, on: boolean): boolean {
    const had = this.held.has(kind);
    if (on === had) return false;
    if (on) this.held.add(kind);
    else this.held.delete(kind);
    return this.activity();
  }

  /** Hide if the idle time is up and nothing holds the controls. Returns true when the state changed. */
  tick(): boolean {
    if (this.current !== "visible" || this.held.size > 0) return false;
    if (this.now() - this.lastActivity < this.idleMs) return false;
    return this.set("hidden");
  }

  /** Time left before `tick` would hide; null when hidden or held. */
  msUntilHide(): number | null {
    if (this.current !== "visible" || this.held.size > 0) return null;
    return Math.max(0, this.idleMs - (this.now() - this.lastActivity));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private set(next: ChromeState): boolean {
    if (next === this.current) return false;
    this.current = next;
    for (const listener of this.listeners) listener();
    return true;
  }
}
