/** Number formats for the inspector, in the active locale; copy stays in the catalogue. */
import { formatDecimal } from "../../i18n/format.ts";

export function formatMagnitude(mag: number): string {
  return formatDecimal(mag, 2);
}

export function formatDegrees(value: number, digits: number): string {
  return `${formatDecimal(value, digits)}°`;
}
