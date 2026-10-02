/**
 * The poster at non-1 device pixel ratios.
 *
 * The offscreen composition lives in device pixels while the blit was coded in
 * logical ones, so at any `devicePixelRatio > 1` the visible canvas showed the
 * poster's top-left corner magnified — first paint on every HiDPI and
 * browser-zoomed display. Browser zoom-out "fixed" it only by dragging the
 * ratio back to 1, and only after a reload, because nothing recomposed.
 *
 * These journeys pin the whole poster on screen at 2x, where the old code
 * provably fails (the caption band shows magnified sky instead of text).
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
  /** Light pixels in the caption band — the title and detail line. */
  captionLight: number;
  captionTotal: number;
}

/**
 * Read the poster's own pixels, not a screenshot of it.
 *
 * A screenshot can be tinted by anything drawn *around* the canvas — a
 * tooltip, a caret — while the backing store is exactly what the blit put
 * there. The caption band is the discriminator: it carries text in a correct
 * render and magnified sky rows in the cropped one, two orders of magnitude
 * apart in light-pixel count.
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
    // Logical caption strip, in backing-store pixels: x 100–700, y 880–960.
    const scaleX = canvas.width / 800;
    const scaleY = canvas.height / 1000;
    const x0 = Math.round(100 * scaleX);
    const x1 = Math.round(700 * scaleX);
    const y0 = Math.round(880 * scaleY);
    const y1 = Math.round(960 * scaleY);
    const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let light = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luma =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (luma > 120) light += 1;
    }
    return {
      backing: { w: canvas.width, h: canvas.height },
      css: { w: rect.width, h: rect.height },
      devicePixelRatio: window.devicePixelRatio,
      captionLight: light,
      captionTotal: (x1 - x0) * (y1 - y0),
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
  test("shows the whole poster, caption included", async ({
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
      expect(sample.backing.h).toBe(Math.round(1000 * sample.devicePixelRatio));
      // The caption band carries the title and detail line: thousands of
      // light pixels. The cropped render shows magnified sky rows here —
      // sparse stars, two orders of magnitude fewer.
      expect(
        sample.captionLight,
        `caption band has no text (light ${sample.captionLight.toString()}/${sample.captionTotal.toString()})`,
      ).toBeGreaterThan(1000);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test("the default render keeps its caption too (control)", async ({
    page,
  }: {
    page: import("@playwright/test").Page;
  }) => {
    await openViewer(page);
    const sample = await samplePoster(page);
    // Ratio-agnostic on purpose: the mobile project runs at a device ratio
    // above 1, so asserting exactly 1 here would fail on a phone for no
    // reason. What must hold at *any* ratio is store-matches-ratio plus text
    // in the caption band.
    expect(sample.backing.w).toBe(
      Math.round(800 * sample.devicePixelRatio),
    );
    expect(sample.backing.h).toBe(
      Math.round(1000 * sample.devicePixelRatio),
    );
    expect(sample.captionLight).toBeGreaterThan(200);
  });
});
