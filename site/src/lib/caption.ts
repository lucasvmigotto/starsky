/** Caption helpers mirroring render-spec.json caption tokens. */

export function formatCoords(lat: number, lon: number): string {
  const latHemi = lat >= 0 ? "N" : "S";
  const lonHemi = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latHemi}, ${Math.abs(lon).toFixed(4)}°${lonHemi}`;
}

/**
 * The caption is part of the artifact, not the visitor's chrome: the same
 * `#s=` link must draw the same words for every visitor. Formatting with the
 * browser's default locale (`undefined`) made a pt-BR visitor's PNG read
 * "25 de dez. de 2024" where an en-US visitor's read "Dec 25, 2024".
 */
export const CAPTION_LOCALE = "en-US";

/** Local wall-clock time of an instant in `tz`, falling back to UTC. */
export function formatLocalTime(whenUtcIso: string, tz: string): string {
  const when = new Date(whenUtcIso);
  try {
    return (
      new Intl.DateTimeFormat(CAPTION_LOCALE, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: tz,
      }).format(when) + ` ${tz}`
    );
  } catch {
    return (
      new Intl.DateTimeFormat(CAPTION_LOCALE, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(when) + " UTC"
    );
  }
}

/**
 * detailTemplate: `{coords} — {place} · {local} {tz}`
 * (place segment omitted when unresolved).
 */
export function formatDetailLine(
  lat: number,
  lon: number,
  place: string | null,
  whenUtcIso: string,
  tz: string,
): string {
  const coords = formatCoords(lat, lon);
  const local = formatLocalTime(whenUtcIso, tz);
  return place ? `${coords} — ${place} · ${local}` : `${coords} — ${local}`;
}
