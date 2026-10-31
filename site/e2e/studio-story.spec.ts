/**
 * The 9:16 story export (BCR-0012): exact dimensions in PNG, SVG and PDF, from
 * both the Viewer and the Studio, and the choice stored nowhere.
 */
import type { Page } from "@playwright/test";
import {
  expect,
  exportStatus,
  fragmentFor,
  openExport,
  pdfPages,
  pngSize,
  readDownload,
  studioUrl,
  test,
  viewerUrl,
} from "./fixtures.ts";

const SURFACES = [
  { name: "Viewer", url: () => viewerUrl(fragmentFor()) },
  { name: "Studio", url: () => studioUrl(fragmentFor()) },
] as const;

async function ready(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
  await openExport(page);
}

async function chooseStory(page: Page): Promise<void> {
  await page.getByRole("radio", { name: "Story (9:16)" }).check();
}

for (const surface of SURFACES) {
  test.describe(`${surface.name}: story export`, () => {
    test.beforeEach(async ({ page }) => {
      await ready(page, surface.url());
    });

    test("offers Standard and Story, Standard selected, as a labelled group", async ({ page }) => {
      await expect(page.getByRole("radiogroup", { name: "Layout" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Standard" })).toBeChecked();
      await expect(page.getByRole("radio", { name: "Story (9:16)" })).not.toBeChecked();
    });

    test("a story PNG is exactly 1080 x 1920 and its file says so", async ({ page }) => {
      await chooseStory(page);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "PNG", exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe("e2e-night-story.png");
      expect(pngSize(await readDownload(file))).toEqual({ width: 1080, height: 1920 });
      await expect(exportStatus(page)).toContainText("Saved e2e-night-story.png");
    });

    test("a story SVG is exactly 1080 x 1920", async ({ page }) => {
      await chooseStory(page);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "SVG", exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe("e2e-night-story.svg");
      const svg = (await readDownload(file)).toString("utf-8");
      const root = /<svg[^>]*>/.exec(svg)?.[0] ?? "";
      expect(root).toContain('width="1080"');
      expect(root).toContain('height="1920"');
      expect(root).toContain('viewBox="0 0 1080 1920"');
      expect(svg).toContain("E2E Night");
      expect(svg).not.toContain("<image");
    });

    test("a story PDF is one 9:16 page", async ({ page }) => {
      await chooseStory(page);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "PDF", exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe("e2e-night-story.pdf");
      const bytes = await readDownload(file);
      expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      const pages = pdfPages(bytes);
      expect(pages).toHaveLength(1);
      // jsPDF's px unit: 1080 x 1920 px is 1440 x 2560 pt.
      expect(pages[0]?.width).toBeCloseTo(1440, 0);
      expect(pages[0]?.height).toBeCloseTo(2560, 0);
      // The poster face is embedded, not substituted.
      expect(bytes.toString("latin1")).toContain("/FontFile2");
    });

    test("standard stays the default and keeps its size", async ({ page }) => {
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "PNG", exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe("e2e-night.png");
      const size = pngSize(await readDownload(file));
      expect(size.width).toBe(1600);
      expect(size.height).toBe(1952);
    });

    test("the choice is stored nowhere: not in the link, not in storage, gone on reload", async ({ page }) => {
      const before = page.url();
      await chooseStory(page);
      expect(page.url()).toBe(before);
      const stored = await page.evaluate(() =>
        JSON.stringify(Object.entries(window.localStorage)) + JSON.stringify(Object.entries(window.sessionStorage)),
      );
      expect(stored).not.toMatch(/story/i);
      await page.reload();
      await openExport(page);
      await expect(page.getByRole("radio", { name: "Standard" })).toBeChecked();
    });

    test("the layout choice is reachable and operable by keyboard", async ({ page }) => {
      await page.getByRole("radio", { name: "Standard" }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("radio", { name: "Story (9:16)" })).toBeChecked();
    });
  });
}
