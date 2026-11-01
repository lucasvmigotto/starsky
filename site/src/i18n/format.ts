/**
 * Interface numbers in the active locale (018-pt-br FR-004): `4.5` in en-US,
 * `4,5` in pt-BR. Always Latin digits, never grouped (a magnitude or an angle
 * is not a quantity of thousands), and always with an explicit locale, never
 * the browser's default.
 *
 * Not for the poster: coordinates and the caption keep the artifact's own
 * format (`lib/caption.ts`).
 */
import { type Locale, getLocale } from "./locale.ts";

const formatters = new Map<string, Intl.NumberFormat>();

export function formatDecimal(value: number, digits: number, locale: Locale = getLocale()): string {
  const key = `${locale}:${digits.toString()}`;
  let formatter = formatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: false,
      numberingSystem: "latn",
    });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}
