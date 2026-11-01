/**
 * Reset view animates (FR-012): the camera glides back to the initial view,
 * the frame counter runs while it does, it ends exactly there, any input takes
 * over, and reduced motion jumps.
 */
import type { Locator, Page } from "@playwright/test";
import { initialCamera } from "../src/lib/sky/observer.ts";
import { BASE_EXPLORER, SIRIUS, expect, explorerUrl, test } from "./fixtures.ts";

const canvasOf = (page: Page): Locator => page.getByRole("img", { name: /sky map/i });
const attr = async (locator: Locator, name: string): Promise<string> => (await locator.getAttribute(name)) ?? "";

const GOAL = initialCamera({
  latDeg: BASE_EXPLORER.lat,
  lonDeg: BASE_EXPLORER.lon,
  when: new Date(BASE_EXPLORER.when_utc),
});

async function open(page: Page): Promise<Locator> {
  await page.goto(explorerUrl(SIRIUS));
  const canvas = canvasOf(page);
  await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  await canvas.focus();
  return canvas;
}

/** Move the camera away from the initial view: zoom in and turn. */
async function wander(page: Page, canvas: Locator): Promise<void> {
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => attr(canvas, "data-fov")).not.toBe("100.000");
}

test.describe("animated reset", () => {
  test("the frame counter runs during the glide and the camera ends exactly at the initial view", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = await open(page);
    await wander(page, canvas);
    const startFov = Number(await attr(canvas, "data-fov"));
    const startFrames = Number(await attr(canvas, "data-frames"));
    await page.keyboard.press("0");

    // Record what the page shows while it glides.
    const seen = await page.evaluate(async () => {
      const el = document.querySelector("canvas");
      if (!el) return { fovs: [] as number[], frames: 0 };
      const fovs: number[] = [];
      const deadline = performance.now() + 1500;
      let last = "";
      while (performance.now() < deadline) {
        const fov = el.dataset["fov"] ?? "";
        if (fov !== last) fovs.push(Number(fov));
        last = fov;
        if (fov === "100.000" && fovs.length > 3) break;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return { fovs, frames: Number(el.dataset["frames"] ?? "0") };
    });
    expect(seen.frames - startFrames).toBeGreaterThanOrEqual(8);
    const middle = seen.fovs.filter((f) => f > startFov + 0.5 && f < 99.5);
    expect(middle.length, "no in-between frames: the reset jumped").toBeGreaterThanOrEqual(3);
    // Monotone toward the goal, never overshooting.
    for (let i = 1; i < seen.fovs.length; i += 1) expect(seen.fovs[i] ?? 0).toBeGreaterThanOrEqual((seen.fovs[i - 1] ?? 0) - 1e-6);

    await expect(canvas).toHaveAttribute("data-fov", "100.000");
    await expect(canvas).toHaveAttribute("data-q", GOAL.orientation.join(","));
  });

  test("the toolbar button glides too", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = await open(page);
    await wander(page, canvas);
    const frames = Number(await attr(canvas, "data-frames"));
    await page.mouse.move(40, 200);
    await page.mouse.move(60, 220);
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(canvas).toHaveAttribute("data-fov", "100.000");
    await expect(canvas).toHaveAttribute("data-q", GOAL.orientation.join(","));
    expect(Number(await attr(canvas, "data-frames")) - frames).toBeGreaterThanOrEqual(8);
  });

  test("any input during the glide takes over from the current pose", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = await open(page);
    await wander(page, canvas);
    await page.keyboard.press("0");
    await expect.poll(async () => Number(await attr(canvas, "data-fov"))).toBeGreaterThan(Number("20"));
    await page.keyboard.press("+");
    // Zoomed in from the pose it was in, not carried on to the goal.
    await page.waitForTimeout(1000);
    expect(await attr(canvas, "data-fov")).not.toBe("100.000");
    expect(await attr(canvas, "data-q")).not.toBe(GOAL.orientation.join(","));
  });

  test("with reduced motion it jumps in at most a frame or two", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const canvas = await open(page);
    await wander(page, canvas);
    const frames = Number(await attr(canvas, "data-frames"));
    await page.keyboard.press("0");
    await expect(canvas).toHaveAttribute("data-fov", "100.000");
    await expect(canvas).toHaveAttribute("data-q", GOAL.orientation.join(","));
    expect(Number(await attr(canvas, "data-frames")) - frames).toBeLessThanOrEqual(3);
  });
});
