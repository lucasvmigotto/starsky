/**
 * Announcements in a real browser (000-design-system T035/T036).
 *
 * The unit test proves the live regions are wired; only a browser proves they
 * are in the accessibility tree and actually change, which is what a screen
 * reader reads.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

/**
 * The Viewer's own live region, found by its label.
 *
 * Scoping by name matters: the export row has a second `role="status"`, and two
 * unlabelled ones are ambiguous to a screen-reader user as well as to a query.
 */
function viewerStatus(page: import("@playwright/test").Page) {
  return page.getByRole("status", { name: /sky viewer status/i });
}

test.describe("viewer announcements", () => {
  test("announces that the poster is ready", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(viewerStatus(page)).toHaveText(/poster ready/i);
  });

  test("announces the figure when one is selected, by name", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    const first = page.locator(".atlas-figure").first();
    const name = (await first.innerText()).split("\n")[0] ?? "";
    await first.click();
    // The announcement must carry the figure's actual name, not a bare
    // "something selected".
    await expect(viewerStatus(page)).toHaveText(new RegExp(name, "i"));
  });

  test("announces returning to the whole sky", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await page.locator(".atlas-figure").first().click();
    await page.getByRole("button", { name: /reset view/i }).click();
    await expect(viewerStatus(page)).toHaveText(/whole sky/i);
  });

  test("exposes the caption as text, not only in the canvas label", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    // The coordinates are in the accessible tree as words. This is T036: an
    // `aria-label` alone would hide the caption from a screen reader.
    await expect(page.getByText(/40\.7580°N/)).toBeAttached();
  });

  test("still names the keyboard path for the canvas", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByText(/list of figures beside the sky/i),
    ).toBeAttached();
  });
});