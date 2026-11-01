/**
 * Performance budget (qa:strategy).
 *
 * There is no server, so "performance" is the visitor's browser rendering and
 * exporting the poster. The architecture's budget is `[ASSUMPTION] <= 2 s on a
 * mid-range phone`; a CI container is not a phone, so this measures under CDP
 * CPU throttling (x4) and reports the result as a **labelled proxy**, never as
 * that claim. Chromium-only: Firefox has no CDP.
 *
 * The Explorer's drag is measured as frame time: the gap between consecutive
 * `requestAnimationFrame` callbacks while a scripted pointer drag redraws the
 * sky. A frame that costs more than the display interval delays the next
 * callback, so the gap is the cost the visitor feels. Numbers are in
 * `specs/017-hardening/finding-perf.md`; a container is not a phone.
 *
 * The numbers are printed and written to `site/test-results/perf.json` so a
 * human can record them; the assertions are deliberately loose guard-rails
 * (a 10x regression fails) rather than a false precision.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  SIRIUS,
  expect,
  explorerUrl,
  fragmentFor,
  openExport,
  test,
  viewerUrl,
} from "./fixtures.ts";

const THROTTLE_RATE = 4;
const RENDER_BUDGET_MS = 2_000;
/** A CI container under x4 throttling is not a phone; allow generous headroom. */
const CI_PROXY_HEADROOM = 4;
/** Any result above this is a regression worth failing on. */
const REGRESSION_CEILING_MS = RENDER_BUDGET_MS * CI_PROXY_HEADROOM;

test.describe("performance (throttled proxy)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "CDP throttling is Chromium-only",
  );

  test("poster render stays within a defensible proxy budget", async ({
    page,
  }) => {
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE_RATE });

    const start = Date.now();
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    const renderMs = Date.now() - start;

    const sample = {
      throttlingRate: THROTTLE_RATE,
      renderMs,
      budgetMs: RENDER_BUDGET_MS,
      ceilingMs: REGRESSION_CEILING_MS,
      note: "CI container under CDP x4 throttle — a relative proxy, not a mid-range phone",
    };
    console.log("PERF", JSON.stringify(sample));
    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/perf.json", `${JSON.stringify(sample, null, 2)}\n`);

    expect(renderMs).toBeLessThan(REGRESSION_CEILING_MS);
  });

  test("each export completes within the proxy budget", async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE_RATE });

    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();

    const results: Record<string, number> = {};
    await openExport(page);
    for (const label of ["PNG", "SVG", "PDF"]) {
      const start = Date.now();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: label, exact: true }).click();
      await download;
      results[label] = Date.now() - start;
    }

    console.log("PERF_EXPORTS", JSON.stringify(results));
    for (const [label, ms] of Object.entries(results)) {
      expect(ms, `${label} export took ${ms.toString()}ms`).toBeLessThan(
        REGRESSION_CEILING_MS,
      );
    }
  });
});

/** The `q`th percentile (0 to 1) by nearest rank. */
function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[rank] ?? Number.NaN;
}

/** Frame gaps (ms) over a scripted circular drag across the Explorer canvas. */
async function dragFrameGaps(page: Page): Promise<{ gaps: number[]; frames: number; moved: boolean }> {
  await page.goto(explorerUrl(SIRIUS));
  const canvas = page.getByRole("img", { name: /sky map/i });
  await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the Explorer canvas has no box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const radius = Math.min(box.width, box.height) / 4;
  const q0 = await canvas.getAttribute("data-q");
  const frames0 = Number((await canvas.getAttribute("data-frames")) ?? "0");

  const recorder = await page.evaluateHandle(() => {
    const gaps: number[] = [];
    let last = performance.now();
    let live = true;
    const tick = (now: number): void => {
      gaps.push(now - last);
      last = now;
      if (live) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return {
      stop: (): number[] => {
        live = false;
        return gaps;
      },
    };
  });

  await page.mouse.move(cx + radius, cy);
  await page.mouse.down();
  const MOVES = 180;
  for (let i = 1; i <= MOVES; i += 1) {
    const angle = (i / MOVES) * Math.PI * 4;
    await page.mouse.move(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  await page.mouse.up();

  // The first gap spans the set-up round trip, not a frame.
  const gaps = (await recorder.evaluate((r) => r.stop())).slice(1);
  const frames = Number((await canvas.getAttribute("data-frames")) ?? "0") - frames0;
  return { gaps, frames, moved: (await canvas.getAttribute("data-q")) !== q0 };
}

test.describe("Explorer drag frame time", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "frame timing and CDP throttling are Chromium-only",
  );
  /** A 60 Hz frame is 16.7 ms; a CI container is slower than a laptop, so the guard is 3x that. */
  const P95_CEILING_MS = 50;
  /** Under x4 throttling the ceiling is a regression guard only, not a claim about a phone. */
  const P95_THROTTLED_CEILING_MS = 200;

  for (const [label, rate, ceiling] of [
    ["unthrottled container", 1, P95_CEILING_MS],
    ["CPU throttled x4 (proxy)", THROTTLE_RATE, P95_THROTTLED_CEILING_MS],
  ] as const) {
    test(`p95 frame time while dragging, ${label}`, async ({ page }) => {
      const client = await page.context().newCDPSession(page);
      await client.send("Emulation.setCPUThrottlingRate", { rate });
      const { gaps, frames, moved } = await dragFrameGaps(page);
      const sorted = [...gaps].sort((a, b) => a - b);
      const sample = {
        label,
        throttlingRate: rate,
        samples: gaps.length,
        appFramesDrawn: frames,
        p50Ms: Number(percentile(sorted, 0.5).toFixed(1)),
        p95Ms: Number(percentile(sorted, 0.95).toFixed(1)),
        maxMs: Number((sorted[sorted.length - 1] ?? Number.NaN).toFixed(1)),
        ceilingMs: ceiling,
      };
      console.log("PERF_DRAG", JSON.stringify(sample));
      mkdirSync("test-results", { recursive: true });
      writeFileSync(`test-results/perf-drag-x${String(rate)}.json`, `${JSON.stringify(sample, null, 2)}\n`);

      // The drag has to have exercised the renderer, or the numbers say nothing.
      expect(moved, "the drag did not move the camera").toBe(true);
      expect(frames, "the drag drew almost no frames").toBeGreaterThan(20);
      expect(gaps.length).toBeGreaterThan(30);
      expect(sample.p95Ms, `p95 frame ${String(sample.p95Ms)}ms`).toBeLessThan(ceiling);
    });
  }
});
