/**
 * Checkpoint screenshots for the retheme (000-design-system T018).
 *
 * T018 is the D19 judgement: the poster's rose constellation lines sit beside
 * the interface's verdigris chrome, and a human has to look at that before the
 * retheme is signed off. Screenshots are the evidence for that decision.
 *
 * Desktop (1440) and mobile (375), the Viewer with a real share fragment and
 * the empty Landing. Run inside a containerized browser, never a host install
 * (containers.md §3).
 */
import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const VIEWER = "eNpVj89OwzAMh18l8jkr2aBs9MYDwGXjAJfIZF4bSJOSuJvGtHfHHX8kJEuOvnx2fjlBQIbmxlTLeqUhpAjNbHld3a3qWkMa2KdYoDmBk84UxBZiA75SEM55JP3_7o_ufOnoSLZwpthyB828MhrakA6_ynS2PjLF4vn4I_TYRs_jlmzwvZdwdSXJeh9toQHz5RFoTGWM4CGnN3LfCCREptRmHDrvQEPpcCDhzmcXSAB7DhN4pIN6Jswq7SmrB4wdMmOEsywM6CZl43sqav0xYiatLgMpv2v1JNloq9aMTGVa-SnyfU_ZO7wSzU6a8L38RsOho2hHduIszOJ2ZuZSG1M3xki9wPkLfUV-sA";
const OUT = "screenshots";

test.describe("retheme checkpoint", () => {
  test("viewer + landing at both widths", async ({ page }) => {
    mkdirSync(OUT, { recursive: true });

    await page.goto(`/#s=${VIEWER}`);
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible({
      timeout: 20_000,
    });
    // Let the reveal settle so the shot shows the final state.
    await page.waitForTimeout(1_200);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${OUT}/viewer-desktop.png`, fullPage: true });
    await page.screenshot({ path: `${OUT}/viewer-desktop-fold.png` });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `${OUT}/viewer-mobile.png`, fullPage: true });

    await page.goto("/");
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${OUT}/landing-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `${OUT}/landing-mobile.png`, fullPage: true });
  });

  test("a figure is selected, to judge accent against the poster", async ({
    page,
  }) => {
    mkdirSync(OUT, { recursive: true });
    await page.goto(`/#s=${VIEWER}`);
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible({
      timeout: 20_000,
    });
    const first = page.locator("button.atlas-figure").first();
    await first.click();
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${OUT}/viewer-figure-selected.png`, fullPage: true });
  });
});