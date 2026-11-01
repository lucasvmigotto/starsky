/**
 * 017 hardening, A2: the journeys a visitor can finish with no pointer.
 *
 * Landing to Explorer, Explorer navigation and selection, and Studio to a PNG.
 * Every step is a key press; focus is reached by Tab, not by script, so a control
 * that is missing from the Tab order fails here. Waits are on observable state.
 */
import type { Locator, Page } from "@playwright/test";
import { initialCamera } from "../src/lib/sky/observer.ts";
import {
  BASE_EXPLORER,
  SIRIUS,
  expect,
  exportStatus,
  explorerUrl,
  fragmentFor,
  pngSize,
  readDownload,
  stubSearch,
  studioUrl,
  test,
} from "./fixtures.ts";

const EIFFEL = {
  lat: "48.8584",
  lon: "2.2945",
  display_name: "Eiffel Tower, Paris, France",
  name: "Eiffel Tower",
  address: { city: "Paris", country: "France" },
};

const MAX_TABS = 80;

/** Press Tab until the element matching `selector` has focus; fail if it never does. */
async function tabTo(page: Page, selector: string): Promise<void> {
  for (let i = 0; i < MAX_TABS; i += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
  }
  throw new Error(`Tab never reached ${selector}`);
}

const attr = async (locator: Locator, name: string): Promise<string> => (await locator.getAttribute(name)) ?? "";

test.describe("keyboard only: landing to Explorer", () => {
  test("type a place, Enter, arrow to a result, Enter, Tab to Explore this sky, Enter", async ({ page }) => {
    await stubSearch(page, [EIFFEL]);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Where do you want to explore the sky from?" })).toBeVisible();

    await tabTo(page, '[role="combobox"]');
    await expect(page.getByRole("combobox", { name: "Search for a place" })).toBeFocused();
    await page.keyboard.type("eiffel");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(page.locator(".landing-selected")).toContainText("Eiffel Tower");

    await tabTo(page, "button.atlas-btn");
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible();
    expect(new URL(page.url()).hash.startsWith("#e=")).toBe(true);
  });
});

test.describe("keyboard only: Explorer", () => {
  async function open(page: Page): Promise<Locator> {
    await page.goto(explorerUrl(SIRIUS));
    const canvas = page.getByRole("img", { name: /sky map/i });
    await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
    return canvas;
  }

  test("Tab reaches the map, arrows turn it, + and - zoom it, 0 resets it", async ({ page }) => {
    const canvas = await open(page);
    await tabTo(page, "canvas");
    await expect(canvas).toBeFocused();

    const q0 = await attr(canvas, "data-q");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => attr(canvas, "data-q")).not.toBe(q0);
    const q1 = await attr(canvas, "data-q");
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => attr(canvas, "data-q")).not.toBe(q1);

    const fov0 = Number(await attr(canvas, "data-fov"));
    await page.keyboard.press("+");
    await expect.poll(async () => Number(await attr(canvas, "data-fov"))).toBeLessThan(fov0);
    const fov1 = Number(await attr(canvas, "data-fov"));
    await page.keyboard.press("-");
    await expect.poll(async () => Number(await attr(canvas, "data-fov"))).toBeGreaterThan(fov1);

    const goal = initialCamera({
      latDeg: BASE_EXPLORER.lat,
      lonDeg: BASE_EXPLORER.lon,
      when: new Date(BASE_EXPLORER.when_utc),
    });
    await page.keyboard.press("0");
    await expect(canvas).toHaveAttribute("data-q", goal.orientation.join(","));
  });

  test("Tab walks the toolbar, a popover opens and closes by key, and the panel lists constellations to choose from", async ({ page }) => {
    const canvas = await open(page);
    await tabTo(page, "canvas");
    await expect(canvas).toBeFocused();

    // The toolbar: every control takes focus in turn, and focusing one shows the controls.
    const toolbar = page.getByRole("toolbar", { name: "Map controls" });
    const seen: string[] = [];
    for (const name of ["Zoom in", "Zoom out", "Reset view", "Layers", "Search"]) {
      await tabTo(page, `[role="toolbar"] [aria-label="${name}"]`);
      await expect(toolbar.getByRole("button", { name, exact: true })).toBeFocused();
      seen.push(name);
      if (name === "Zoom in") {
        // Activate it from the keyboard: the sky zooms in.
        const fov0 = Number(await attr(canvas, "data-fov"));
        await page.keyboard.press("Enter");
        await expect.poll(async () => Number(await attr(canvas, "data-fov"))).toBeLessThan(fov0);
      }
      if (name === "Layers") {
        // A popover opens on Enter and closes on Escape, with focus kept on its button.
        const layers = page.getByRole("button", { name: "Layers", exact: true });
        await page.keyboard.press("Enter");
        await expect(layers).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
        await expect(layers).toHaveAttribute("aria-expanded", "false");
        await expect(layers).toBeFocused();
      }
    }
    expect(seen).toHaveLength(5);
    await expect(page.locator(".explorer-stage-inner")).toHaveAttribute("data-chrome", "visible");

    // Open the panel from its tab, choose a constellation from the list.
    await tabTo(page, 'button[aria-controls="explorer-inspector-body"]:not([aria-hidden="true"])');
    await page.keyboard.press("Enter");
    await expect(page.locator("#explorer-inspector-body")).toBeVisible();
    await tabTo(page, ".explorer-list-item");
    const name = (await page.evaluate(() => document.activeElement?.querySelector("span")?.textContent ?? "")).trim();
    expect(name).not.toBe("");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    await expect(page.getByRole("status", { name: "Map announcements" })).toHaveText(`${name} constellation selected.`);
  });
});

test.describe("keyboard only: Studio to PNG", () => {
  test("Tab to Export, Enter, Tab to PNG, Enter downloads the file", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();

    await tabTo(page, "#export-trigger");
    await page.keyboard.press("Enter");
    await expect(page.locator("#export-trigger")).toHaveAttribute("aria-expanded", "true");

    const png = page.getByRole("button", { name: "PNG", exact: true });
    await expect(png).toBeVisible();
    for (let i = 0; i < MAX_TABS && !(await png.evaluate((el) => el === document.activeElement)); i += 1) {
      await page.keyboard.press("Tab");
    }
    await expect(png).toBeFocused();

    const download = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    const file = await download;
    expect(file.suggestedFilename()).toBe("e2e-night.png");
    expect(pngSize(await readDownload(file)).width).toBe(1600);
    await expect(exportStatus(page)).toContainText("Saved e2e-night.png");
  });
});
