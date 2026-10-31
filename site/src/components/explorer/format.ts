/** Number formats for the inspector; copy stays in the catalogue. */

export function formatMagnitude(mag: number): string {
  return mag.toFixed(2);
}

export function formatDegrees(value: number, digits: number): string {
  return `${value.toFixed(digits)}°`;
}
