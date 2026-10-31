/**
 * Moving between the Explorer, the Studio and the Viewer, and old links
 * (012-poster-studio, US2 and US4).
 */
import type { Page } from "@playwright/test";
import { decodeShareFragment } from "../src/lib/share.ts";
import { decodeExplorer } from "../src/lib/sky/payload.ts";
import {
  BASE_EXPLORER,
  SIRIUS,
  expect,
  exportStatus,
  explorerUrl,
  fragmentFor,
  openExport,
  pngSize,
  readDownload,
  studioUrl,
  test,
  viewerUrl,
} from "./fixtures.ts";

/**
 * A fragment from before the Studio existed: `SAMPLE_FRAGMENTS[0]` of
 * `src/lib/site.ts`, written by the repo's own encoder. Pinned as a literal on
 * purpose, so a change to the codec cannot quietly change what it decodes.
 */
const OLD_FRAGMENT =
  "eNpVj89OwzAMh18l8jkr2aBs9MYDwGXjAJfIZF4bSJOSuJvGtHfHHX8kJEuOvnx2fjlBQIbmxlTLeqUhpAjNbHld3a3qWkMa2KdYoDmBk84UxBZiA75SEM55JP3_7o_ufOnoSLZwpthyB828MhrakA6_ynS2PjLF4vn4I_TYRs_jlmzwvZdwdSXJeh9toQHz5RFoTGWM4CGnN3LfCCREptRmHDrvQEPpcCDhzmcXSAB7DhN4pIN6Jswq7SmrB4wdMmOEsywM6CZl43sqav0xYiatLgMpv2v1JNloq9aMTGVa-SnyfU_ZO7wSzU6a8L38RsOho2hHduIszOJ2ZuZSG1M3xki9wPkLfUV-sA";

function explorerOf(page: Page): ReturnType<typeof decodeExplorer> {
  const hash = new URL(page.url()).hash;
  expect(hash.startsWith("#e=")).toBe(true);
  return decodeExplorer(hash.slice(3));
}

async function toolbar(page: Page) {
  const bar = page.getByRole("toolbar", { name: "Map controls" });
  await expect(bar).toBeVisible();
  return bar;
}

test.describe("Explorer to Studio and back", () => {
  test("Create poster opens the Studio with the same scene and default composition", async ({ page }) => {
    await page.goto(explorerUrl(SIRIUS, { title: "Winter night", mag: 6.5 }));
    const bar = await toolbar(page);
    await bar.getByRole("button", { name: "Create poster" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Poster Studio" })).toBeVisible();
    await expect(page.getByRole("img", { name: /night sky poster titled winter night/i })).toBeVisible();
    const draft = decodeShareFragment(new URL(page.url()).hash.slice("#studio=".length));
    expect(draft.place).toBe(BASE_EXPLORER.place);
    expect(draft.when_utc).toBe(BASE_EXPLORER.when_utc);
    expect(draft.tz).toBe(BASE_EXPLORER.tz);
    expect(draft.options.title).toBe("Winter night");
    expect(draft.options.magnitude_limit).toBe(6.5);
    expect(draft.options.shape).toBe("circle");
    expect(draft.options.projection).toBe("stereographic");
  });

  test("Return to Explorer restores the camera the visitor left", async ({ page }) => {
    await page.goto(explorerUrl(SIRIUS, { fov: 30 }));
    const bar = await toolbar(page);
    // Move off the initial view so a restored camera is not a coincidence.
    await bar.getByRole("button", { name: "Zoom out" }).click();
    await expect.poll(() => explorerOf(page).fov).toBeGreaterThan(30);
    const left = explorerOf(page);

    await bar.getByRole("button", { name: "Create poster" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Poster Studio" })).toBeVisible();
    await page.getByRole("link", { name: "Return to Explorer" }).click();

    await toolbar(page);
    const back = explorerOf(page);
    expect(back.fov).toBeCloseTo(left.fov, 3);
    for (const [i, c] of left.q.entries()) expect(back.q[i]).toBeCloseTo(c, 3);
    expect(back.place).toBe(BASE_EXPLORER.place);
    expect(back.when_utc).toBe(BASE_EXPLORER.when_utc);
  });

  test("a tab with no memory of the Explorer returns to the initial view, and the link carries no camera memory", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    await page.getByRole("link", { name: "Return to Explorer" }).click();
    await toolbar(page);
    const view = explorerOf(page);
    expect(view.fov).toBe(100);
    expect(view.sel).toBeNull();
    expect(view.place).toBe("Times Square");
    expect(page.url()).not.toMatch(/returnCamera/i);
  });
});

test.describe("Explorer toolbar on a phone", () => {
  for (const width of [390, 360]) {
    test(`keeps every button, Create poster included, inside a ${width.toString()} px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(explorerUrl(SIRIUS));
      const bar = await toolbar(page);
      const names = await bar.getByRole("button").evaluateAll((els) =>
        els.map((el) => el.getAttribute("aria-label") ?? (el.textContent ?? "").trim()),
      );
      expect(names).toContain("Create poster");
      for (const button of await bar.getByRole("button").all()) {
        if (!(await button.isVisible())) continue;
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `test-results/explorer-toolbar-${width.toString()}.png` });
    });
  }
});

test.describe("Viewer actions", () => {
  test("Explore this sky opens the Explorer for its place and moment, leaving the link as it was", async ({ page }) => {
    const url = viewerUrl(fragmentFor());
    await page.goto(url);
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await toolbar(page);
    const explorer = explorerOf(page);
    expect(explorer.place).toBe("Times Square");
    expect(explorer.when_utc).toBe("2026-01-01T00:00:00Z");
    // The original link is untouched, and one step back.
    await page.goBack();
    expect(new URL(page.url()).hash).toBe(new URL(url, "http://x").hash);
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
  });

  test("Make your own from this sky opens the Studio seeded from the link", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await page.getByRole("button", { name: "Make your own from this sky" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Poster Studio" })).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("E2E Night");
    await expect(page.getByLabel("Limiting magnitude")).toHaveValue("4.5");
  });
});

test.describe("old #s= links", () => {
  test("a pinned older fragment still opens the Viewer, and exports a standard PNG at its old size", async ({ page }) => {
    await page.goto(`/#s=${OLD_FRAGMENT}`);
    await expect(page.getByRole("img", { name: /new year over manhattan/i })).toBeVisible();
    expect(new URL(page.url()).hash).toBe(`#s=${OLD_FRAGMENT}`);
    await expect(page.getByRole("heading", { name: "Poster Studio" })).toHaveCount(0);

    await openExport(page);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("new-year-over-manhattan.png");
    expect(pngSize(await readDownload(file))).toEqual({ width: 1600, height: 1952 });
    await expect(exportStatus(page)).toContainText("Saved new-year-over-manhattan.png");
    // Viewing never rewrote the link.
    expect(new URL(page.url()).hash).toBe(`#s=${OLD_FRAGMENT}`);
  });
});

test.describe("a shared moment that is not a date", () => {
  for (const [surface, url] of [
    ["Viewer", viewerUrl],
    ["Studio", studioUrl],
  ] as const) {
    test(`the ${surface} says the link is invalid instead of going blank`, async ({ page }) => {
      await page.goto(url(fragmentFor({ when_utc: "not a date" })));
      await expect(page.getByText("This link holds no sky")).toBeVisible();
      await expect(page.getByRole("button", { name: "Explore this sky" })).toHaveCount(0);
    });
  }
});
