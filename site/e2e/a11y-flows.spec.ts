/**
 * 017 hardening, A1: axe on every state a visitor can leave open.
 *
 * The existing specs check one state per page. This one walks the states the
 * hardening spec names — landing (map shown, results open, coordinates on),
 * Explorer (controls hidden, controls shown, inspector open), Studio (export
 * and share popovers open) and the poster page — and fails on any serious or
 * critical violation, naming the rule and the nodes.
 *
 * `color-contrast` is checked by `contrast.spec.ts` on computed colours (see
 * `a11y.spec.ts` for why axe cannot resolve Tailwind v4's colour functions).
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import {
  SIRIUS,
  expect,
  explorerUrl,
  fragmentFor,
  openExport,
  placeOptions,
  stubSearch,
  studioUrl,
  test,
  viewerUrl,
  wakeChrome,
} from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PARIS = {
  lat: "48.8584",
  lon: "2.2945",
  display_name: "Eiffel Tower, Paris, France",
  name: "Eiffel Tower",
  address: { city: "Paris", country: "France" },
};

async function expectNoBlocking(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(["color-contrast"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    blocking.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`).join("\n"),
  ).toBe("");
}

async function openLanding(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Where do you want to explore the sky from?" })).toBeVisible();
}

async function openExplorer(page: Page): Promise<void> {
  await page.goto(explorerUrl(SIRIUS));
  await expect(page.getByRole("img", { name: /sky map/i })).toHaveAttribute("data-frames", /^[1-9]\d*$/);
}

test.describe("axe across states: landing", () => {
  test("map shown", async ({ page }) => {
    await openLanding(page);
    await expect(page.getByRole("region", { name: "Map for choosing a place" })).toBeVisible();
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeAttached();
    await expectNoBlocking(page);
  });

  test("search results open", async ({ page }) => {
    await stubSearch(page, [PARIS]);
    await openLanding(page);
    const search = page.getByRole("combobox", { name: "Search for a place" });
    await search.fill("eiffel");
    await search.press("Enter");
    await expect(placeOptions(page)).toHaveCount(1);
    await expectNoBlocking(page);
  });

  test("coordinates switched on", async ({ page }) => {
    await openLanding(page);
    await page.getByRole("switch", { name: "Coordinates" }).click();
    await expect(page.getByRole("switch", { name: "Coordinates" })).toHaveAttribute("aria-checked", "true");
    await expectNoBlocking(page);
  });
});

test.describe("axe across states: Explorer", () => {
  test("controls hidden (the state it opens in)", async ({ page }) => {
    await openExplorer(page);
    await expect(page.locator(".explorer-stage-inner")).toHaveAttribute("data-chrome", "hidden");
    await expectNoBlocking(page);
  });

  test("controls shown", async ({ page }) => {
    await openExplorer(page);
    await wakeChrome(page);
    await expectNoBlocking(page);
  });

  test("inspector open", async ({ page }) => {
    await openExplorer(page);
    await wakeChrome(page);
    await page.getByRole("button", { name: "Show details" }).filter({ visible: true }).click();
    await expect(page.locator("#explorer-inspector-body")).toBeVisible();
    await expectNoBlocking(page);
  });
});

test.describe("axe across states: Studio", () => {
  test("export popover open", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await openExport(page);
    await expectNoBlocking(page);
  });

  test("share popover open", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    await expectNoBlocking(page);
  });
});

test.describe("axe across states: poster page", () => {
  test("poster shown, export open", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await openExport(page);
    await expectNoBlocking(page);
  });
});
