/** Caption helpers mirroring render-spec.json caption tokens. */
import type { Locale } from "../i18n/locale.ts";

export function formatCoords(lat: number, lon: number): string {
  const latHemi = lat >= 0 ? "N" : "S";
  const lonHemi = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latHemi}, ${Math.abs(lon).toFixed(4)}°${lonHemi}`;
}

/**
 * The locale of a link that names none: every link made before 018 has no
 * `lang`, and it must keep drawing the words it always drew.
 */
export const DEFAULT_POSTER_LOCALE: Locale = "en-US";

/**
 * Local wall-clock time of an instant in `tz`, falling back to UTC.
 *
 * The locale is **always explicit** (spec 017, 018 FR-006). The poster passes
 * its link's language and the interface passes the active locale; the
 * browser's default (`undefined`) would make the same `#s=` link draw
 * "25 de dez. de 2024" for one visitor and "Dec 25, 2024" for another.
 */
export function formatLocalTime(whenUtcIso: string, tz: string, locale: Locale): string {
  const when = new Date(whenUtcIso);
  try {
    return (
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: tz,
      }).format(when) + ` ${tz}`
    );
  } catch {
    return (
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(when) + " UTC"
    );
  }
}

/**
 * detailTemplate: `{coords} — {place} · {local} {tz}`
 * (place segment omitted when unresolved). Only the date is localized:
 * coordinates, the place and the zone name are the same in every language.
 */
export function formatDetailLine(
  lat: number,
  lon: number,
  place: string | null,
  whenUtcIso: string,
  tz: string,
  locale: Locale,
): string {
  const coords = formatCoords(lat, lon);
  const local = formatLocalTime(whenUtcIso, tz, locale);
  return place ? `${coords} — ${place} · ${local}` : `${coords} — ${local}`;
}
