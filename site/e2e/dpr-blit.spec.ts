/**
 * The poster image at non-1 device pixel ratios.
 *
 * The offscreen composition lives in device pixels while the blit was coded in
 * logical ones, so at any `devicePixelRatio > 1` the visible canvas showed the
 * poster's top-left corner magnified — first paint on every HiDPI and
 * browser-zoomed display. Browser zoom-out "fixed" it only by dragging the
 * ratio back to 1, and only after a reload, because nothing recomposed.
 *
 * These journeys pin the whole sky image on screen at 2x, where the old code
 * provably fails (the ring shows magnified sky instead of a full circle). Since
 * BCR-0013 the page shows the sky region only, so the discriminator is the ring
 * rather than the caption band the exports still carry.
 */
import type { Browser } from "@playwright/test";
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

const PORT = Number(process.env["E2E_PORT"] ?? "4173");
const BASE_URL =
  process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${String(PORT)}`;

interface PosterSample {
  /** Backing store, in device pixels. */
  backing: { w: number; h: number };
  /** CSS box, in viewport pixels. */
  css: { w: number; h: number };
  devicePixelRatio: number;
  /** How many of the four ring points (right, bottom, left, top) show the ring. */
  ringPoints: number;
}

/**
 * Read the poster's own pixels, not a screenshot of it.
 *
 * A screenshot can be tinted by anything drawn *around* the canvas — a
 * caret, a scrollbar — while the backing store is exactly what the blit put
 * there. The ring is the discriminator: the unit circle is on screen at all
 * four compass points in a correct render, and in the cropped one those points
 * show magnified sky instead.
 */
async function samplePoster(
  page: import("@playwright/test").Page,
): Promise<PosterSample> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("no poster canvas");
    }
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    // The sky is 800x800 logical; the ring sits at 400 / 1.06 from the centre.
    const scale = canvas.width / 800;
    const ringR = 400 / 1.06;
    const luma = (x: number, y: number): number => {
      const [r = 0, g = 0, b = 0] = ctx.getImageData(
        Math.round(x * scale),
        Math.round(y * scale),
        1,
        1,
      ).data;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const background = luma(4, 4);
    let ringPoints = 0;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ] as const) {
      // The brightest pixel across the ring's width, against the corner's.
      let best = 0;
      for (let r = ringR - 4; r <= ringR + 4; r += 0.5) {
        best = Math.max(best, luma(400 + dx * r, 400 + dy * r));
      }
      if (best > background + 20) ringPoints += 1;
    }
    return {
      backing: { w: canvas.width, h: canvas.height },
      css: { w: rect.width, h: rect.height },
      devicePixelRatio: window.devicePixelRatio,
      ringPoints,
    };
  });
}

async function openViewer(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto(viewerUrl(fragmentFor()));
  await expect(
    page.getByRole("img", { name: /night sky poster/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
}

test.describe("poster at device pixel ratio 2", () => {
  test("shows the whole sky image", async ({
    browser,
  }: {
    browser: Browser;
  }) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    try {
      await openViewer(page);
      const sample = await samplePoster(page);

      // The emulation actually applied — otherwise this proves nothing.
      expect(sample.devicePixelRatio).toBe(2);
      // The backing store is the logical poster at the device ratio; a stale
      // 1x store under a 2x blit is the other half of the same bug. (It is
      // *not* the CSS box times the ratio — the element is laid out narrower
      // than 800px and the browser downscales.)
      expect(sample.backing.w).toBe(Math.round(800 * sample.devicePixelRatio));
      // Sky region only: no caption band rows on the page (BCR-0013).
      expect(sample.backing.h).toBe(Math.round(800 * sample.devicePixelRatio));
      expect(sample.ringPoints, "the ring is not whole on screen").toBe(4);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test("the default render is whole too (control)", async ({
    page,
  }: {
    page: import("@playwright/test").Page;
  }) => {
    await openViewer(page);
    const sample = await samplePoster(page);
    // Ratio-agnostic on purpose: the mobile project runs at a device ratio
    // above 1, so asserting exactly 1 here would fail on a phone for no
    // reason. What must hold at *any* ratio is store-matches-ratio plus a whole
    // ring.
    expect(sample.backing.w).toBe(
      Math.round(800 * sample.devicePixelRatio),
    );
    expect(sample.backing.h).toBe(
      Math.round(800 * sample.devicePixelRatio),
    );
    expect(sample.ringPoints).toBe(4);
  });
});
