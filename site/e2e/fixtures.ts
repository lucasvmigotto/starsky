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
import { lookAt } from "../src/lib/sky/camera.ts";
import { type ExplorerPayload, encodeExplorer } from "../src/lib/sky/payload.ts";
import { raDecToVec } from "../src/lib/sky/vec.ts";

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

export function studioUrl(fragment: string): string {
  return `/#studio=${fragment}`;
}

/** A downloaded file's bytes. */
export async function readDownload(
  download: import("@playwright/test").Download,
): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** Width and height from a PNG's IHDR chunk (bytes 16 to 24). */
export function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** The page boxes of a PDF, read from its `/MediaBox` entries. */
export function pdfPages(bytes: Buffer): { width: number; height: number }[] {
  const text = bytes.toString("latin1");
  return [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map(
    (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  );
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

/**
 * The export row's status region. The share row (ShareDialog) has its own
 * `.atlas-export-status` too, so scope by the row holding the export formats.
 */
export function exportStatus(page: import("@playwright/test").Page) {
  return page
    .locator(".atlas-export")
    .filter({ has: page.getByRole("group", { name: "Export formats", includeHidden: true }) })
    .locator(".atlas-export-status");
}

/** Sirius, HIP:32349, J2000 as the catalogue holds it. */
export const SIRIUS = { raDeg: 101.28854105, decDeg: -16.71314306 };

export const BASE_EXPLORER: ExplorerPayload = {
  v: 1,
  lat: 40.758,
  lon: -73.9855,
  place: "Times Square",
  tz: "UTC",
  when_utc: "2026-01-01T05:00:00Z",
  title: null,
  mag: 6.5,
  q: [0, 0, 0, 1],
  fov: 30,
  layers: { below: "dimmed" },
  sel: null,
};

/** An `#e=` URL whose camera looks at the given sky position, north up. */
export function explorerUrl(
  at: { raDeg: number; decDeg: number },
  overrides: Partial<ExplorerPayload> = {},
): string {
  const q = lookAt(raDecToVec(at.raDeg, at.decDeg), [0, 0, 1]);
  return `/#e=${encodeExplorer({ ...BASE_EXPLORER, q, ...overrides })}`;
}

/**
 * The Explorer opens with its controls hidden (014-explorer-polish), and a hidden
 * control takes no pointer. A pointer move brings them back, as it does for a
 * visitor. They hide again 4 s after the last activity, so a test that waits
 * longer than that before using a control wakes it again.
 */
export async function wakeChrome(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.getByRole("img", { name: /sky map/i });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the Explorer canvas has no box");
  const x = box.x + 24;
  const y = box.y + box.height * 0.55;
  await page.mouse.move(x, y);
  await page.mouse.move(x + 6, y + 4);
  await expect(page.locator(".explorer-stage-inner")).toHaveAttribute("data-chrome", "visible");
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
