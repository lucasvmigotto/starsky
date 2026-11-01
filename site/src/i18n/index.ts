/**
 * Copy lookup — a thin `t()` over the active locale's catalogue
 * (000-design-system T004, 018-pt-br T001).
 *
 * No i18n framework, deliberately: two catalogues and a locale store are all
 * the product needs, and the `t()` signature every call site uses is unchanged
 * from the single-locale days. The active locale lives in `./locale.ts`.
 *
 * A missing key **fails visibly** — it renders the key itself and warns, rather
 * than silently rendering an empty string. A blank button is a bug you find in
 * review; a missing key you find in production.
 */
import { enUS, type CopyKey } from "./en-US.ts";
import { type Locale, getLocale } from "./locale.ts";
import { ptBR } from "./pt-BR.ts";

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
const catalogues: Readonly<Record<Locale, Readonly<Partial<Record<string, string>>>>> = {
  "en-US": enUS,
  "pt-BR": ptBR,
};

/** All keys the vision defines. Used by the staleness test. */
export function copyKeys(): readonly string[] {
  return Object.keys(enUS);
}

/**
 * Resolve a key, interpolating `{placeholder}` params.
 *
 * Unknown keys warn once and return `⟨key⟩` so the gap is visible in the UI
 * without shipping prose nobody approved (the skill's rule: a missing key is an
 * `[UPSTREAM GAP]` for `frontend:uiux`, never improvised copy).
 */
export function t(key: string, params?: CopyParams): string {
  const template: string | undefined = catalogues[getLocale()][key];
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

/**
 * Each language named in itself (an endonym), whatever the active locale: a
 * visitor who cannot read the current language can still find their own.
 */
export const LANGUAGE_NAME_KEYS = {
  "en-US": "site.language.en",
  "pt-BR": "site.language.ptBR",
} as const satisfies Record<Locale, CopyKey>;

export type { CopyKey };
export { type Locale, LOCALES, getLocale, isLocale, setLocale, subscribeLocale } from "./locale.ts";