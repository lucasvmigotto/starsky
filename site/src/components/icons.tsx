/**
 * The interface's icons: inline SVG, `currentColor`, one stroke style (24 px
 * grid, 1.75 px stroke, round caps and joins), no library. Icons are
 * decoration; the button carries the accessible name and the tooltip.
 */
import type { JSX } from "react";

const PATHS = {
  "zoom-in": <path d="M12 5v14M5 12h14" />,
  "zoom-out": <path d="M5 12h14" />,
  reset: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10v9h11v-9" />
    </>
  ),
  layers: (
    <>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  poster: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="m5 17 4.5-4.5 3.5 3.5 2.5-2.5L19 17" />
    </>
  ),
  "lock-open": (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </>
  ),
  "lock-closed": (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
} as const;

export type IconName = keyof typeof PATHS;

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

interface Props {
  name: IconName;
  /** Rendered size in px; the drawing grid stays 24. */
  size?: number;
}

export function Icon({ name, size = 20 }: Props): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {PATHS[name]}
    </svg>
  );
}
