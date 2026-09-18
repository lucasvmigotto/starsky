/**
 * Browser equivalent of `utc_from_local` in `src/starpy/astro/observer.py`:
 * interpret wall-clock components as being in the named IANA zone and return
 * the corresponding UTC instant. Resolves the zone offset via
 * `Intl.DateTimeFormat` round-trips (two fixed-point iterations handle DST
 * transitions for unambiguous times). Throws `RangeError` for unknown zones,
 * mirroring the `ZoneInfo(tz)` fail-fast on the Python side.
 */

function offsetMinutesAt(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - utcMs) / 60000;
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // The Intl constructor inside offsetMinutesAt throws RangeError for unknown
  // zones — fail fast, like ZoneInfo on the Python side.
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wallAsUtc;
  for (let i = 0; i < 2; i += 1) {
    guess = wallAsUtc - offsetMinutesAt(guess, timeZone) * 60000;
  }
  return new Date(guess);
}

/**
 * Serialize a UTC instant the way Pydantic does for `when_utc`
 * (`"2026-01-01T00:00:00Z"`, no millis when zero) so fragments stay
 * byte-identical to Python-generated links.
 */
export function toWhenUtcIso(date: Date): string {
  return date.toISOString().replace(/\.000Z$/, "Z");
}
