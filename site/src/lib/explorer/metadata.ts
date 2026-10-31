/**
 * The moment strip's three states (expanded, compact, pinned) as a small state
 * machine with an injected clock, and the text it shows. Activity is whatever
 * the page decides it is; this module only keeps time.
 */

import { formatCoords } from "../caption.ts";

export type MetadataMode = "expanded" | "compact" | "pinned";

/** Expanded turns compact after this long without pointer, touch or key activity. */
export const IDLE_MS = 2500;

export interface MetadataOptions {
  now: () => number;
  idleMs?: number;
}

export class MetadataMachine {
  private state: MetadataMode = "expanded";
  private lastActivity: number;
  private readonly now: () => number;
  private readonly idleMs: number;
  private readonly listeners = new Set<() => void>();

  constructor(options: MetadataOptions) {
    this.now = options.now;
    this.idleMs = options.idleMs ?? IDLE_MS;
    this.lastActivity = this.now();
  }

  get mode(): MetadataMode {
    return this.state;
  }

  /** Returns true when the mode changed. Pinned ignores activity. */
  activity(): boolean {
    if (this.state === "pinned") return false;
    this.lastActivity = this.now();
    return this.set("expanded");
  }

  /** Move to compact if the idle time is up. Returns true when the mode changed. */
  tick(): boolean {
    if (this.state !== "expanded") return false;
    if (this.now() - this.lastActivity < this.idleMs) return false;
    return this.set("compact");
  }

  /** Time left before `tick` would go compact; null unless expanded. */
  msUntilCompact(): number | null {
    if (this.state !== "expanded") return null;
    return Math.max(0, this.idleMs - (this.now() - this.lastActivity));
  }

  pin(): void {
    this.set("pinned");
  }

  unpin(): void {
    if (this.state !== "pinned") return;
    this.lastActivity = this.now();
    this.set("expanded");
  }

  togglePin(): void {
    if (this.state === "pinned") this.unpin();
    else this.pin();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private set(next: MetadataMode): boolean {
    if (next === this.state) return false;
    this.state = next;
    for (const listener of this.listeners) listener();
    return true;
  }
}

export interface MomentInput {
  lat: number;
  lon: number;
  place: string | null;
  title: string | null;
  when_utc: string;
  tz: string;
}

export interface Moment {
  title: string | null;
  place: string | null;
  coords: string;
  /** Local date, time and zone, derived from `when_utc` and `tz`. */
  local: string;
  /** One line: title, place (else coordinates), time. */
  compact: string;
  /** Everything, for a screen reader; it does not depend on the visual state. */
  full: string;
}

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

function localTime(whenUtc: string, tz: string): string {
  const when = new Date(whenUtc);
  try {
    return new Intl.DateTimeFormat("en-US", { ...DATE_PARTS, timeZone: tz }).format(when);
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...DATE_PARTS, timeZone: "UTC" }).format(when);
  }
}

export function formatMoment(input: MomentInput): Moment {
  const coords = formatCoords(input.lat, input.lon);
  const local = localTime(input.when_utc, input.tz);
  const title = input.title === "" ? null : input.title;
  const place = input.place === "" ? null : input.place;
  const compact = [title, place ?? coords, local].filter((part) => part !== null).join(" · ");
  const full = [title, place, local, coords].filter((part) => part !== null).join(", ");
  return { title, place, coords, local, compact, full };
}
