/**
 * Reset view animates (FR-012): the camera glides back to the initial view,
 * the frame counter runs while it does, it ends exactly there, any input takes
 * over, and reduced motion jumps.
 *
 * The glide lasts a fixed time (300 to 800 ms), so how many frames a machine
 * draws inside it depends on how fast that machine is: a starved container drew
 * 3 or 4. The tests that count frames therefore drive the page's own clock
 * (Playwright's `page.clock`), one 16 ms step per frame, instead of racing a
 * real-time observer against the animation. The frame count is then the same on
 * every machine, and nothing here sleeps.
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

/** One display frame at 60 Hz. */
const FRAME_MS = 16;
const MAX_STEPS = 120;

async function open(page: Page): Promise<Locator> {
  await page.clock.install();
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

/** Stop the page's clock, so it moves only when `stepFrames` moves it. */
async function pauseClock(page: Page): Promise<void> {
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}

/**
 * Advance the paused clock one frame at a time until `done` holds, recording
 * the fov after each step. Fails if it never does, so a glide that stalls is an
 * error and not a hang.
 */
async function stepFrames(page: Page, canvas: Locator, done: (fovs: number[]) => boolean): Promise<number[]> {
  const fovs: number[] = [];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    await page.clock.runFor(FRAME_MS);
    const fov = Number(await attr(canvas, "data-fov"));
    if (fovs[fovs.length - 1] !== fov) fovs.push(fov);
    if (done(fovs)) return fovs;
  }
  throw new Error(`the glide did not finish in ${String(MAX_STEPS)} frames: ${fovs.join(", ")}`);
}

test.describe("animated reset", () => {
  test("the frame counter runs during the glide and the camera ends exactly at the initial view", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = await open(page);
    await wander(page, canvas);
    const startFov = Number(await attr(canvas, "data-fov"));
    const startFrames = Number(await attr(canvas, "data-frames"));
    await pauseClock(page);
    await page.keyboard.press("0");
    const fovs = await stepFrames(page, canvas, (seen) => seen[seen.length - 1] === 100);
    const frames = Number(await attr(canvas, "data-frames")) - startFrames;
    expect(frames).toBeGreaterThanOrEqual(8);
    const middle = fovs.filter((f) => f > startFov + 0.5 && f < 99.5);
    expect(middle.length, "no in-between frames: the reset jumped").toBeGreaterThanOrEqual(3);
    // Monotone toward the goal, never overshooting.
    for (let i = 1; i < fovs.length; i += 1) expect(fovs[i] ?? 0).toBeGreaterThanOrEqual((fovs[i - 1] ?? 0) - 1e-6);

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
    await expect(page.locator(".explorer-stage-inner")).toHaveAttribute("data-chrome", "visible");
    await pauseClock(page);
    await page.getByRole("button", { name: "Reset view" }).click();
    await stepFrames(page, canvas, (seen) => seen[seen.length - 1] === 100);
    await expect(canvas).toHaveAttribute("data-fov", "100.000");
    await expect(canvas).toHaveAttribute("data-q", GOAL.orientation.join(","));
    expect(Number(await attr(canvas, "data-frames")) - frames).toBeGreaterThanOrEqual(8);
  });

  test("any input during the glide takes over from the current pose", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const canvas = await open(page);
    await wander(page, canvas);
    await pauseClock(page);
    await page.keyboard.press("0");
    await stepFrames(page, canvas, (seen) => (seen[seen.length - 1] ?? 0) > 20);
    await page.keyboard.press("+");
    // Zoomed in from the pose it was in, not carried on to the goal: let more
    // than the longest glide pass on the page's clock, then look.
    await page.clock.runFor(1000);
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
