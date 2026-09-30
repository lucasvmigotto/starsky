/**
 * Browser-side Nominatim geocoding. Mirrors the contract of
 * `src/starsky/geocoding/nominatim.py` (endpoint, params, `short_place_name`
 * label logic) but is deliberately distinct from the server-side client:
 *
 * - Browser `fetch` cannot set a `User-Agent` header (forbidden header
 *   name), so client-side identification relies on the automatic `Referer`
 *   header instead of the REQUIRED descriptive `User-Agent` the Python app
 *   sends. No `email` parameter is used.
 * - There is no response cache and no throttle here beyond the user's own
 *   clicks; Nominatim's usage policy (max ~1 req/s, no heavy/bulk use)
 *   applies — this call fires at most once per form submit, place mode only.
 */

const SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

const CITY_KEYS = ["city", "town", "village", "municipality", "county"] as const;

export interface NominatimItem {
  name?: unknown;
  display_name?: unknown;
  address?: Record<string, unknown> | null;
}

export interface ResolvedPlace {
  lat: number;
  lon: number;
  displayName: string;
  short: string;
}

/** Stringify a Nominatim scalar (name/road/city/…); anything else -> "". */
function toText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/**
 * Poster-friendly short label. Exact port of `short_place_name` in
 * `nominatim.py`: prefers name/road + city + state-or-country, deduped,
 * max 3 parts; falls back to truncated `display_name`.
 */
export function shortPlaceName(item: NominatimItem): string {
  const address = item.address ?? {};
  const name = toText(item.name ?? address["road"] ?? "");
  let city = "";
  for (const key of CITY_KEYS) {
    if (address[key]) {
      city = toText(address[key]);
      break;
    }
  }
  const state = toText(address["state"] ?? "");
  const country = toText(address["country"] ?? "");
  const tail = state && state !== city ? state : country;
  const parts: string[] = [];
  for (const part of [name, city, tail]) {
    if (part && !parts.includes(part)) {
      parts.push(part);
    }
  }
  if (parts.length > 0) {
    return parts.slice(0, 3).join(", ");
  }
  return toText(item.display_name ?? "").slice(0, 80);
}

/** Resolve `place` -> coordinates + labels. Throws on empty/no-result/HTTP. */
export async function geocodePlace(place: string): Promise<ResolvedPlace> {
  const query = place.trim();
  if (!query) {
    throw new Error("Enter a place name or switch to coordinates mode.");
  }
  const url =
    `${SEARCH_URL}?q=${encodeURIComponent(query)}` +
    "&format=jsonv2&limit=1&addressdetails=1";
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(`Geocoding request failed for ${JSON.stringify(query)}.`);
  }
  if (!response.ok) {
    throw new Error(
      `Geocoding failed (HTTP ${String(response.status)}) for ${JSON.stringify(query)}.`,
    );
  }
  const items = (await response.json()) as NominatimItem[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`No place found for ${JSON.stringify(query)}.`);
  }
  const first = (items[0] ?? {}) as NominatimItem & { lat?: unknown; lon?: unknown };
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Geocoder returned bad coordinates for ${JSON.stringify(query)}.`);
  }
  return {
    lat,
    lon,
    displayName: toText(first.display_name ?? ""),
    short: shortPlaceName(first),
  };
}
