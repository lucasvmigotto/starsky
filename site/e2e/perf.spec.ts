/**
 * Performance budget (qa:strategy).
 *
 * There is no server, so "performance" is the visitor's browser rendering and
 * exporting the poster. The architecture's budget is `[ASSUMPTION] <= 2 s on a
 * mid-range phone`; a CI container is not a phone, so this measures under CDP
 * CPU throttling (x4) and reports the result as a **labelled proxy**, never as
 * that claim. Chromium-only: Firefox has no CDP.
 *
 * The numbers are printed and written to `site/test-results/perf.json` so a
 * human can record them; the assertions are deliberately loose guard-rails
 * (a 10x regression fails) rather than a false precision.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  expect,
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
