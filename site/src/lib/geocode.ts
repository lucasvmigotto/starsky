/**
 * Browser-side Nominatim geocoding. Mirrors the contract of
 * `src/starsky/geocoding/nominatim.py` (endpoint, params, `short_place_name`
 * label logic) but is deliberately distinct from the server-side client:
 *
 * - Browser `fetch` cannot set a `User-Agent` header (forbidden header
 *   name), so client-side identification relies on the automatic `Referer`
 *   header instead of the REQUIRED descriptive `User-Agent` the Python app
 *   sends. No `email` parameter is used.
 * - There is no response cache and no throttle here beyond the caller's own
 *   (the landing debounces its search and cancels a request when the text
 *   changes); Nominatim's usage policy (max ~1 req/s, no heavy/bulk use) applies.
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

/** Nominatim's raw rows for `query`; throws on a network or HTTP failure. */
async function fetchItems(
  query: string,
  limit: number,
  signal: AbortSignal | undefined,
): Promise<NominatimItem[]> {
  const url =
    `${SEARCH_URL}?q=${encodeURIComponent(query)}` +
    `&format=jsonv2&limit=${String(limit)}&addressdetails=1`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, signal });
  } catch (error) {
    // A cancelled search is the caller's doing, not a failure to report.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(`Geocoding request failed for ${JSON.stringify(query)}.`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(
      `Geocoding failed (HTTP ${String(response.status)}) for ${JSON.stringify(query)}.`,
    );
  }
  const items = (await response.json()) as NominatimItem[];
  return Array.isArray(items) ? items : [];
}

function toResolved(item: NominatimItem & { lat?: unknown; lon?: unknown }): ResolvedPlace | null {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    displayName: toText(item.display_name ?? ""),
    short: shortPlaceName(item),
  };
}

/**
 * Up to `limit` matches for the landing's search list. An empty list means
 * nothing matched; a rejection means the service failed, and an abort through
 * `signal` rejects with an `AbortError`.
 */
export async function searchPlaces(
  place: string,
  { signal, limit = 5 }: { signal?: AbortSignal; limit?: number } = {},
): Promise<ResolvedPlace[]> {
  const query = place.trim();
  if (!query) return [];
  const items = await fetchItems(query, limit, signal);
  return items.flatMap((item) => toResolved(item) ?? []);
}
