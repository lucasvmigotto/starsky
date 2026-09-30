/**
 * Copy lookup — a thin `t()` over the locale catalogue (000-design-system T004).
 *
 * No i18n framework yet, deliberately: `pt-BR` is its own slice after the
 * retheme (vision D17), and swapping the catalogue implementation later must
 * not touch a single call site. The signature is the part that has to survive.
 *
 * A missing key **fails visibly** — it renders the key itself and warns, rather
 * than silently rendering an empty string. A blank button is a bug you find in
 * review; a missing key you find in production.
 */
import { enUS, type CopyKey } from "./en-US.ts";

/**
 * Interpolation values, indexed as `Partial` for the same reason as the
 * catalogue: a template may reference a `{placeholder}` the caller did not
 * supply, and that must be detectable rather than rendered as `undefined`.
 */
export type CopyParams = Readonly<
  Partial<Record<string, string | number>>
>;

/**
 * Indexed deliberately as `Partial`: a key may be any string at runtime (a
 * typo, a key from a locale file that has not landed), and a total type would
 * claim the lookup cannot miss — which is exactly the check that must exist.
 */
const catalogue: Readonly<Partial<Record<string, string>>> = enUS;

/** All keys the vision defines. Used by the staleness test. */
export function copyKeys(): readonly string[] {
  return Object.keys(catalogue);
}

/**
 * Resolve a key, interpolating `{placeholder}` params.
 *
 * Unknown keys warn once and return `⟨key⟩` so the gap is visible in the UI
 * without shipping prose nobody approved (the skill's rule: a missing key is an
 * `[UPSTREAM GAP]` for `frontend:uiux`, never improvised copy).
 */
export function t(key: string, params?: CopyParams): string {
  const template: string | undefined = catalogue[key];
  if (template === undefined) {
    console.warn(
      `[i18n] missing copy key: ${key}. Add it to docs/product/ux-vision.md, then regenerate src/i18n/en-US.ts.`,
    );
    return `⟨${key}⟩`;
  }
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value: string | number | undefined = params[name];
    // An unfilled placeholder left in the output is a bug worth seeing.
    if (value === undefined) {
      console.warn(`[i18n] ${key} is missing the parameter {${name}}.`);
      return match;
    }
    return String(value);
  });
}

export type { CopyKey };