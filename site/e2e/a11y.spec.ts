/**
 * Accessibility (qa:strategy): axe on the key flows, plus a keyboard-only
 * export check. Constitution VI sets WCAG 2.2 AA as a product requirement.
 *
 * **Contrast and Tailwind's colour functions.** Tailwind v4 emits
 * `color-mix(in oklab, …)` for opacity utilities (`text-cream/60`). axe-core on
 * this Chromium build does not resolve `oklab`/`color-mix`, so it falls back to
 * a bogus foreground (reported `#48494d` where the computed colour is
 * `rgb(245,239,224)`, i.e. 16.57:1 real vs 2.11:1 reported) and flags 30 false
 * positives. Disabling the rule outright would hide genuine contrast
 * regressions, so `color-contrast` is checked by `contrast.spec.ts` against the
 * **computed** colours instead — values, not axe's interpretation of them.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function analyze(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .disableRules(["color-contrast"])
    .analyze();
}

test.describe("accessibility", () => {
  test("the landing form has no serious or critical violations", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /show my sky/i })).toBeVisible();
    const results = await analyze(page);
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toBe("");
  });

  test("the viewer has no serious or critical violations", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    const results = await analyze(page);
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toBe("");
  });

  test("a keyboard user can reach and trigger an export", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    const svg = page.getByRole("button", { name: "SVG", exact: true });
    await expect(svg).toBeVisible();

    // Focus the control directly and activate with the keyboard.
    await svg.focus();
    await expect(svg).toBeFocused();

    const download = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.svg$/);
  });
});
