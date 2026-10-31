/**
 * The Poster Studio (012-poster-studio): live preview, the draft in the
 * fragment, export, share, errors, keyboard, and phone layout.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { decodeShareFragment } from "../src/lib/share.ts";
import {
  expect,
  exportStatus,
  fragmentFor,
  openExport,
  pngSize,
  readDownload,
  studioUrl,
  test,
} from "./fixtures.ts";

const POSTER = /night sky poster/i;

async function openStudio(page: Page, overrides = {}): Promise<void> {
  await page.goto(studioUrl(fragmentFor(overrides)));
  await expect(page.getByRole("img", { name: POSTER })).toBeVisible();
}

/** The canvas's pixels, as a data URL, to compare two states of the preview. */
function pixels(page: Page): Promise<string> {
  return page
    .getByRole("img", { name: POSTER })
    .evaluate((el) => (el as HTMLCanvasElement).toDataURL());
}

function draftOf(page: Page): ReturnType<typeof decodeShareFragment> {
  const hash = new URL(page.url()).hash;
  expect(hash.startsWith("#studio=")).toBe(true);
  return decodeShareFragment(hash.slice("#studio=".length));
}

test.describe("Poster Studio", () => {
  test("shows the poster, the poster-only controls and a read-only summary", async ({ page }) => {
    await openStudio(page);
    await expect(page.getByRole("heading", { level: 1, name: "Poster Studio" })).toBeVisible();
    for (const label of ["Projection", "Fisheye strength", "Minimum separation", "Glow intensity", "Limiting magnitude", "Title"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("radiogroup", { name: "Shape" })).toBeVisible();
    await expect(page.getByLabel("Constellation lines")).toBeVisible();
    await expect(page.getByLabel("Constellation labels")).toBeVisible();
    const summary = page.getByRole("group", { name: "Moment" });
    await expect(summary).toContainText("Times Square");
    await expect(summary.locator("input")).toHaveCount(0);
  });

  test("redraws the preview on every control and updates the fragment without reloading", async ({ page }) => {
    await openStudio(page);
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>)["__studioMarker"] = true;
    });
    const before = await pixels(page);

    await page.getByLabel("Limiting magnitude").fill("6.8");
    await expect.poll(() => pixels(page)).not.toBe(before);
    await expect.poll(() => draftOf(page).options.magnitude_limit).toBe(6.8);

    const afterMagnitude = await pixels(page);
    await page.getByRole("radio", { name: "square" }).check();
    await expect.poll(() => pixels(page)).not.toBe(afterMagnitude);
    await expect.poll(() => draftOf(page).options.shape).toBe("square");

    const afterShape = await pixels(page);
    await page.getByLabel("Title", { exact: true }).fill("Second thoughts");
    await expect.poll(() => pixels(page)).not.toBe(afterShape);
    await expect.poll(() => draftOf(page).options.title).toBe("Second thoughts");

    // Same document throughout: replaceState never reloaded the page.
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)["__studioMarker"])).toBe(true);
    expect(new URL(page.url()).hash.startsWith("#s=")).toBe(false);
  });

  test("refuses a title the poster font cannot draw and keeps the last good one", async ({ page }) => {
    await openStudio(page);
    await page.getByLabel("Title", { exact: true }).fill("Night \u{1F30C}");
    await expect(page.getByRole("alert").filter({ hasText: "\u{1F30C}" })).toBeVisible();
    expect(draftOf(page).options.title).toBe("E2E Night");
    await page.getByLabel("Title", { exact: true }).fill("Night");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect.poll(() => draftOf(page).options.title).toBe("Night");
  });

  test("exports a standard PNG, naming the file", async ({ page }) => {
    await openStudio(page);
    await openExport(page);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("e2e-night.png");
    const size = pngSize(await readDownload(file));
    expect(size.width).toBe(1600);
    await expect(exportStatus(page)).toContainText("Saved e2e-night.png");
  });

  test("copies a #s= link, never a #studio= one", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (text: string) => {
            (window as unknown as Record<string, unknown>)["__copied"] = text;
            return Promise.resolve();
          },
        },
      });
    });
    await openStudio(page);
    await page.getByLabel("Limiting magnitude").fill("3.5");
    await expect.poll(() => draftOf(page).options.magnitude_limit).toBe(3.5);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByText("Link copied")).toBeVisible();
    const copied = await page.evaluate(() => (window as unknown as Record<string, string>)["__copied"] ?? "");
    expect(copied).toContain("#s=");
    expect(copied).not.toContain("studio=");
    const copiedFragment = copied.slice(copied.indexOf("#s=") + 3);
    expect(decodeShareFragment(copiedFragment).options.magnitude_limit).toBe(3.5);
  });

  test("an unreadable draft shows the invalid-link pattern with a way back", async ({ page }) => {
    await page.goto("/#studio=not-a-draft");
    await expect(page.getByText("This link holds no sky")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("could not be read");
    await page.getByRole("link", { name: "Back to the start" }).click();
    await expect(page.getByRole("button", { name: /show my sky/i })).toBeVisible();
  });

  test("makes no request outside this site", async ({ page, baseURL }) => {
    const foreign: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/^https?:/.test(url) && !url.startsWith(baseURL ?? "")) foreign.push(url);
    });
    await openStudio(page);
    await openExport(page);
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    await expect(exportStatus(page)).toContainText("Saved");
    expect(foreign).toEqual([]);
  });

  test("is reachable and operable by keyboard alone", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "not a supported browser");
    await openStudio(page);
    const reached = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      const id = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "";
        return el.id || el.getAttribute("aria-label") || (el.textContent ?? "").trim();
      });
      if (id) reached.add(id);
    }
    for (const expected of [
      "studio-projection",
      "studio-fisheye",
      "studio-separation",
      "studio-glow",
      "studio-mag",
      "studio-title",
      "share-trigger",
      "export-trigger",
      "Return to Explorer",
    ]) {
      expect(reached, `Tab never reached ${expected}`).toContain(expected);
    }

    // Typing in the title field, with no pointer, redraws and updates the draft.
    await page.getByLabel("Title", { exact: true }).focus();
    await page.keyboard.press("End");
    await page.keyboard.type(" II");
    await expect.poll(() => draftOf(page).options.title).toBe("E2E Night II");
  });

  test("has no serious or critical accessibility violations", async ({ page }) => {
    await openStudio(page);
    await openExport(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["color-contrast"])
      .analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
  });

  test("fits a 390 px phone without horizontal scroll, preview first", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudio(page);
    await openExport(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const poster = await page.getByRole("img", { name: POSTER }).boundingBox();
    const title = await page.getByLabel("Title", { exact: true }).boundingBox();
    expect(poster).not.toBeNull();
    expect(title).not.toBeNull();
    // Stacked: the controls sit below the preview, not beside it.
    expect((title?.y ?? 0)).toBeGreaterThan((poster?.y ?? 0) + (poster?.height ?? 0) - 1);
    await page.screenshot({ path: "test-results/studio-390.png", fullPage: true });
  });
});
