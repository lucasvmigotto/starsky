/**
 * Sky Explorer (`#e=`, 010-explorer-canvas): navigation, picking, idle frames,
 * accessibility, and that nothing reachable before it moved.
 *
 * The canvas exposes `data-frames` and `data-fov` for these checks and nothing
 * else reads them. Waits are polls on those values, never sleeps.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import {
  SIRIUS,
  expect,
  explorerUrl,
  fragmentFor,
  test,
  viewerUrl,
} from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

function canvasOf(page: Page): Locator {
  return page.getByRole("img", { name: /sky map/i });
}

async function openExplorer(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  const canvas = canvasOf(page);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  return canvas;
}

async function centreOf(canvas: Locator): Promise<{ x: number; y: number; w: number; h: number }> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width, h: box.height };
}

async function attr(canvas: Locator, name: string): Promise<string> {
  return (await canvas.getAttribute(name)) ?? "";
}

/** Count of bright pixels on the canvas: stars, lines and text all count. */
async function litPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return -1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return -1;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0) > 300) n++;
    }
    return n;
  });
}

test.describe("explorer", () => {
  test("draws the sky for the link, with nothing from a third party", async ({ page, consoleErrors }) => {
    const requested: string[] = [];
    page.on("request", (request) => {
      requested.push(request.url());
    });
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    expect(await litPixels(page)).toBeGreaterThan(20);
    await expect(canvas).toHaveAttribute("tabindex", "0");
    const host = new URL(page.url()).host;
    const foreign = requested.filter((url) => {
      const u = new URL(url);
      return u.protocol.startsWith("http") && u.host !== host;
    });
    expect(foreign).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("selects a known star by clicking the centre, and Escape clears it", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const c = await centreOf(canvas);
    await page.mouse.click(c.x, c.y);
    const status = page.getByRole("status");
    await expect(status).toHaveText(/^Sirius selected, above the horizon\.$/);
    await canvas.focus();
    await page.keyboard.press("Escape");
    await expect(status).toHaveText("Selection cleared.");
  });

  test("a drag never selects", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const c = await centreOf(canvas);
    const before = await attr(canvas, "data-frames");
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 30, c.y + 12, { steps: 4 });
    await page.mouse.up();
    await expect(canvas).not.toHaveAttribute("data-frames", before);
    await expect(page.getByRole("status")).toHaveText("Sky Explorer ready.");
  });

  test("taps select on touch screens", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "touch input needs the mobile project");
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const c = await centreOf(canvas);
    await page.touchscreen.tap(c.x, c.y);
    await expect(page.getByRole("status")).toHaveText(/^Sirius selected/);
  });

  test("rotates across the north celestial pole without a jump or an error", async ({ page, consoleErrors }) => {
    const canvas = await openExplorer(page, explorerUrl({ raDeg: 0, decDeg: 89 }, { fov: 60 }));
    const fovBefore = await attr(canvas, "data-fov");
    const c = await centreOf(canvas);
    await page.mouse.move(c.x, c.y - c.h * 0.4);
    await page.mouse.down();
    const stepPx = 20;
    for (let y = c.y - c.h * 0.4; y < c.y + c.h * 0.45; y += stepPx) {
      await page.mouse.move(c.x, y);
    }
    await page.mouse.up();
    expect(await attr(canvas, "data-fov")).toBe(fovBefore);
    expect(await litPixels(page)).toBeGreaterThan(20);
    expect(consoleErrors).toEqual([]);
  });

  test("stops zooming at the limits, and 0 returns to the start", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const c = await centreOf(canvas);
    await page.mouse.move(c.x, c.y);
    await expect
      .poll(async () => {
        for (let i = 0; i < 20; i++) await page.mouse.wheel(0, -400);
        return attr(canvas, "data-fov");
      })
      .toBe("5.000");
    await expect
      .poll(async () => {
        for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 400);
        return attr(canvas, "data-fov");
      })
      .toBe("120.000");
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("0");
    await expect(canvas).toHaveAttribute("data-fov", "100.000");
  });

  test("draws no frames while idle", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const nextFrames = (): Promise<void> =>
      page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          }),
      );
    // Startup may take a few frames (the resize notification); wait for it to settle.
    await expect
      .poll(async () => {
        const a = await attr(canvas, "data-frames");
        await nextFrames();
        return a === (await attr(canvas, "data-frames"));
      })
      .toBe(true);
    const settled = await attr(canvas, "data-frames");
    for (let i = 0; i < 10; i++) await nextFrames();
    expect(await attr(canvas, "data-frames")).toBe(settled);
  });

  test("has no serious or critical accessibility violations", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(["color-contrast"])
      .analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
  });

  test("a link it cannot read shows an error with a way back", async ({ page }) => {
    await page.goto("/#e=not-a-payload");
    await expect(page.getByRole("heading", { name: "This link holds no sky" })).toBeVisible();
    await page.getByRole("link", { name: "Back to the start" }).click();
    await expect(page.getByRole("button", { name: /show my sky/i })).toBeVisible();
  });

  test("#s= still opens the poster, without loading Explorer code", async ({ page }) => {
    const chunks: string[] = [];
    page.on("request", (request) => {
      if (/ExplorerPage/.test(request.url())) chunks.push(request.url());
    });
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    expect(chunks).toEqual([]);
  });
});
