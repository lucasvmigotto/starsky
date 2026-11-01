/**
 * J4 — place lookup (qa:strategy).
 *
 * Place search is the product's geocoder call. Both outcomes must be handled:
 * a resolved place carries into the Explorer, and a failure is surfaced rather
 * than silently ignored. The lookup is stubbed (`stubSearch`) — an automated
 * suite must never hit Nominatim's live service; `j8` is the opt-in live check.
 */
import { decodeExplorer } from "../src/lib/sky/payload.ts";
import { expect, stubSearch, test } from "./fixtures.ts";

const SEARCH = "Search for a place";

async function startLanding(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Date and time").fill("2026-01-01T00:00");
  await page.getByLabel("Timezone", { exact: true }).fill("UTC");
}

test.describe("J4 place lookup", () => {
  test("a resolved place opens the Explorer there", async ({ page }) => {
    await stubSearch(page, [
      {
        lat: "48.8584",
        lon: "2.2945",
        display_name: "Eiffel Tower, Paris, France",
        name: "Eiffel Tower",
        address: { city: "Paris", country: "France" },
      },
    ]);

    await startLanding(page);
    await page.getByRole("combobox", { name: SEARCH }).fill("Eiffel Tower");
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Explore this sky" }).click();

    await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible();
    const payload = decodeExplorer(new URL(page.url()).hash.slice("#e=".length));
    expect(payload).toMatchObject({ lat: 48.8584, lon: 2.2945, place: "Eiffel Tower, Paris, France" });
  });

  test("a failing lookup is announced, does not navigate, and leaves the form usable", async ({ page }) => {
    await stubSearch(page, { status: 500 });

    await startLanding(page);
    await page.getByRole("combobox", { name: SEARCH }).fill("Nowhere At All");

    await expect(
      page.getByRole("status").filter({ hasText: "Place search is unavailable right now." }),
    ).toBeVisible();
    // Still on the landing: only the form's own #c= may be in the address.
    expect(new URL(page.url()).hash).not.toMatch(/^#(e|s|studio)=/);
    await expect(page.getByRole("combobox", { name: SEARCH })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeEnabled();
  });

  test("an empty result is announced", async ({ page }) => {
    await stubSearch(page, []);

    await startLanding(page);
    await page.getByRole("combobox", { name: SEARCH }).fill("Nowhere At All");

    await expect(
      page.getByRole("status").filter({ hasText: "No place found for “Nowhere At All”" }),
    ).toBeVisible();
  });

  test("an empty moment is named and blocks leaving", async ({ page }) => {
    await startLanding(page);
    await page.getByLabel("Date and time").fill("");
    await page.getByRole("button", { name: "Explore this sky" }).click();

    await expect(page.getByRole("alert")).toHaveText("Pick a date and time for the sky.");
    await expect(page.getByRole("combobox", { name: SEARCH })).toBeVisible();
  });
});
