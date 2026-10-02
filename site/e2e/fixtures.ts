/**
 * Shared e2e fixtures.
 *
 * Builds share fragments with the **real** codec (`encode.ts`), so the journeys
 * exercise the same payload the product emits — never a hand-written string that
 * could drift from the format.
 *
 * No sleeps: every wait is a Playwright auto-waiting assertion on a condition.
 */
import { expect, test as base } from "@playwright/test";
import { encodePayload } from "../src/lib/encode.ts";
import type { SharePayload } from "../src/lib/share.ts";

export const BASE_PAYLOAD: SharePayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square",
  when_utc: "2026-01-01T00:00:00Z",
  tz: "UTC",
  options: {
    projection: "stereographic",
    fisheye_strength: 1.0,
    min_separation: 0.008,
    magnitude_limit: 4.5,
    glow: true,
    glow_intensity: 1.0,
    constellations: true,
    constellation_labels: true,
    shape: "circle",
    title: "E2E Night",
  },
};

export function fragmentFor(overrides: Partial<SharePayload> = {}): string {
  return encodePayload({ ...BASE_PAYLOAD, ...overrides });
}

export function viewerUrl(fragment: string): string {
  return `/#s=${fragment}`;
}

/**
 * Reveal the export formats.
 *
 * The Viewer collapses them behind one trigger (vision principle 3 — export is
 * the last step, and three permanent buttons out-shouted the poster). Anything
 * that clicks a format must open this first, so the helpers live here rather
 * than being repeated per journey.
 */
export async function openExport(
  page: import("@playwright/test").Page,
): Promise<void> {
  const trigger = page.getByRole("button", { name: "Export", exact: true });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) === "false") {
    await trigger.click();
  }
  await expect(page.getByRole("button", { name: "PNG", exact: true })).toBeVisible();
}

/** A shared `test` that fails the test on any unexpected console error. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      await use(errors);
    },
    { auto: true },
  ],
});

export { expect };
