/**
 * J4 — place lookup (qa:strategy).
 *
 * Place search is the product's only outbound call. Both outcomes must be
 * handled: a resolved place renders, and a failure is surfaced rather than
 * silently ignored. The lookup is intercepted — an automated suite must never
 * hit Nominatim's live service.
 */
import { expect, test } from "./fixtures.ts";

const NOMINATIM = "**/nominatim.openstreetmap.org/**";
const PLACE_INPUT = "#landing-place";
const WHEN_INPUT = "#landing-when";
const TZ_INPUT = "#landing-tz";

/** Fill the form completely: the submit requires a date and time. */
async function completeForm(
  page: import("@playwright/test").Page,
  place: string,
): Promise<void> {
  await page.getByRole("radio", { name: "place", exact: true }).check();
  await page.locator(PLACE_INPUT).fill(place);
  await page.locator(WHEN_INPUT).fill("2026-01-01T00:00");
  await page.locator(TZ_INPUT).fill("UTC");
}

test.describe("J4 place lookup", () => {
  test("a resolved place renders a poster", async ({ page }) => {
    await page.route(NOMINATIM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            lat: "48.8584",
            lon: "2.2945",
            display_name: "Eiffel Tower, Paris, France",
            name: "Eiffel Tower",
            address: { city: "Paris", country: "France" },
          },
        ]),
      });
    });

    await page.goto("/");
    await completeForm(page, "Eiffel Tower");
    await page.getByRole("button", { name: /show my sky/i }).click();

    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
  });

  test("a failing lookup surfaces an error and does not navigate", async ({
    page,
  }) => {
    await page.route(NOMINATIM, async (route) => {
      await route.fulfill({ status: 500, body: "boom" });
    });

    await page.goto("/");
    const urlBefore = page.url();
    await completeForm(page, "Nowhere At All");
    await page.getByRole("button", { name: /show my sky/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    expect(page.url()).toBe(urlBefore);
  });

  test("an empty result surfaces an error", async ({ page }) => {
    await page.route(NOMINATIM, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });

    await page.goto("/");
    await completeForm(page, "Nowhere At All");
    await page.getByRole("button", { name: /show my sky/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("the date is required, so an empty one blocks submission natively", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "place", exact: true }).check();
    await page.locator(PLACE_INPUT).fill("Paris");
    // The input is `required`; the browser refuses to submit, so React's
    // handler never runs and no alert appears. Assert that, not an alert.
    const when = page.locator(WHEN_INPUT);
    await page.getByRole("button", { name: /show my sky/i }).click();
    expect(await when.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(
      false,
    );
    // Still on the form.
    await expect(page.locator(PLACE_INPUT)).toBeVisible();
  });
});
