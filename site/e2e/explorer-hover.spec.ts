/**
 * Constellation hover (FR-013): a mouse resting over a figure highlights it and
 * its list item, a list item highlights its figure, and neither costs more than
 * the one frame the change needs. Touch does not hover.
 */
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { lookAt, projectToViewport } from "../src/lib/sky/camera.ts";
import { raDecToVec } from "../src/lib/sky/vec.ts";
import { BASE_EXPLORER, SIRIUS, expect, explorerUrl, test, wakeChrome } from "./fixtures.ts";

const read = (name: string): unknown => JSON.parse(readFileSync(new URL(`../public/data/${name}`, import.meta.url), "utf8"));
const catalog = read("catalog.json") as { stars: [number, number, number, number][] };
const segmentsFile = read("constellations.json") as { segments: [string, string, number, number][] };

const canvasOf = (page: Page): Locator => page.getByRole("img", { name: /sky map/i });
const tab = (page: Page): Locator => page.locator(".explorer-tab");
const frames = async (page: Page): Promise<number> => Number((await canvasOf(page).getAttribute("data-frames")) ?? "0");

/** Where a figure's line can be hovered with no star near it and no other line close by, in viewport pixels. */
function figurePoint(width: number, height: number): { x: number; y: number; name: string } {
  const camera = { orientation: lookAt(raDecToVec(SIRIUS.raDeg, SIRIUS.decDeg), [0, 0, 1] as [number, number, number]), fovDeg: BASE_EXPLORER.fov };
  const at = new Map<number, { x: number; y: number }>();
  for (const [hip, ra, dec] of catalog.stars) {
    const p = projectToViewport(camera, raDecToVec(ra, dec), width, height);
    if (p) at.set(hip, p);
  }
  const bright = catalog.stars.filter((s) => s[3] <= BASE_EXPLORER.mag).map((s) => at.get(s[0])).filter((p) => p !== undefined);
  const segs = segmentsFile.segments.flatMap(([abbr, name, a, b]) => {
    const pa = at.get(a);
    const pb = at.get(b);
    return pa && pb ? [{ abbr, name, pa, pb }] : [];
  });
  for (const s of segs) {
    const x = (s.pa.x + s.pb.x) / 2;
    const y = (s.pa.y + s.pb.y) / 2;
    if (x < 200 || x > width - 420 || y < 120 || y > height - 120) continue;
    if (bright.some((p) => Math.hypot(p.x - x, p.y - y) < 30)) continue;
    const other = segs.some((o) => o.abbr !== s.abbr && distanceToSegment(x, y, o.pa, o.pb) < 20);
    if (other) continue;
    return { x, y, name: s.name };
  }
  throw new Error("no hoverable figure on screen");
}

function distanceToSegment(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

const hoveredItems = (page: Page): Locator => page.locator('.explorer-list-item[data-hover="true"], .explorer-group-summary[data-hover="true"]');

async function openWithPanel(page: Page): Promise<{ x: number; y: number; name: string }> {
  await page.goto(explorerUrl(SIRIUS));
  await expect(canvasOf(page)).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  const vp = page.viewportSize();
  if (!vp) throw new Error("no viewport");
  const point = figurePoint(vp.width, vp.height);
  await wakeChrome(page);
  await tab(page).click();
  await expect(page.locator("#explorer-inspector-body")).toBeVisible();
  // Let the panel finish sliding: the list must not move under the test.
  await expect(page.locator(".explorer-inspector")).toHaveCSS("visibility", "visible");
  await expect.poll(async () => (await page.locator(".explorer-inspector").boundingBox())?.x ?? 0).toBeLessThan(vp.width - 250);
  // The panel slid in under a resting mouse, which hovers whatever list item is there: move off it.
  await page.mouse.move(3, 3);
  await expect(hoveredItems(page)).toHaveCount(0);
  return point;
}

/** Wait until the sky has stopped drawing, so a baseline is not a frame still on its way. */
async function settled(page: Page): Promise<void> {
  let last = -1;
  await expect
    .poll(async () => {
      const now = await frames(page);
      const quiet = now === last;
      last = now;
      await page.waitForTimeout(250);
      return quiet;
    })
    .toBe(true);
}


test.describe("constellation hover", () => {
  test.skip(({ isMobile }) => isMobile, "a mouse is not the phone's pointer");

  test("a mouse over a figure styles its list item and keeps keyboard focus where it was", async ({ page }) => {
    const point = await openWithPanel(page);
    await canvasOf(page).focus();
    await page.mouse.move(point.x - 30, point.y - 30);
    await page.mouse.move(point.x, point.y + 2);
    await expect(hoveredItems(page)).toHaveCount(1);
    await expect(canvasOf(page)).toBeFocused();
    // The list keeps its order: names stay sorted.
    const names = await page.locator("details.explorer-group").first().locator(".explorer-list-item > span:first-child").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    // Leaving the figure clears it.
    await page.mouse.move(point.x + 4, point.y + 90);
    await expect(hoveredItems(page)).toHaveCount(0);
  });

  test("moving within the same figure draws nothing more", async ({ page }) => {
    const point = await openWithPanel(page);
    await page.mouse.move(point.x - 20, point.y - 40);
    await page.mouse.move(point.x, point.y + 1);
    await expect(hoveredItems(page)).toHaveCount(1);
    await settled(page);
    const before = await frames(page);
    for (let i = 0; i < 8; i += 1) await page.mouse.move(point.x + i * 0.5, point.y + (i % 2));
    await page.waitForTimeout(300);
    expect(await frames(page)).toBe(before);
  });

  test("hovering a list item redraws the sky once, and leaving it once more", async ({ page }) => {
    await openWithPanel(page);
    const item = page.locator("details.explorer-group").first().locator(".explorer-list-item").nth(2);
    await item.scrollIntoViewIfNeeded();
    await settled(page);
    const before = await frames(page);
    await item.hover();
    await expect(item).toHaveAttribute("data-hover", "true");
    await expect.poll(() => frames(page)).toBeGreaterThan(before);
    await page.waitForTimeout(300);
    const hovered = await frames(page);
    expect(hovered - before).toBeLessThanOrEqual(3);
    await page.mouse.move(5, 5);
    await expect(item).not.toHaveAttribute("data-hover", "true");
    await page.waitForTimeout(300);
    expect((await frames(page)) - hovered).toBeLessThanOrEqual(3);
  });

  test("a touch pointer over a figure shows no hover and draws nothing", async ({ page }) => {
    const point = await openWithPanel(page);
    await settled(page);
    const before = await frames(page);
    await page.evaluate(
      ({ x, y }) => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(
          new PointerEvent("pointermove", { pointerId: 9, pointerType: "touch", clientX: rect.left + x, clientY: rect.top + y, bubbles: true }),
        );
      },
      { x: point.x, y: point.y },
    );
    await page.waitForTimeout(300);
    await expect(hoveredItems(page)).toHaveCount(0);
    expect(await frames(page)).toBe(before);
  });
});
