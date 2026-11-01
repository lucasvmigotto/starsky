/**
 * Constellation tooltip and star list (019) in a real browser.
 *
 * A mouse resting on a figure for 1.5 s shows its name, its star count and up
 * to three named stars; a star under the pointer keeps its own tooltip; Escape
 * closes it first; touch never shows it. A selected constellation's panel
 * lists its stars, and choosing one selects that star.
 *
 * Time is Playwright's clock, installed before the page loads and moved with
 * `runFor`, so nothing here sleeps. The expected copy is worked out on the
 * Node side from the same data files and the same pure builders the page uses.
 */
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { constellationTip, figureStars } from "../src/lib/explorer/figure.ts";
import { prepareObserverView } from "../src/lib/explorer/observerView.ts";
import { lookAt, projectToViewport } from "../src/lib/sky/camera.ts";
import { decodeExplorer, explorerFragmentFromHash } from "../src/lib/sky/payload.ts";
import { prepareScene } from "../src/lib/sky/scene.ts";
import { raDecToVec } from "../src/lib/sky/vec.ts";
import { BASE_EXPLORER, SIRIUS, expect, explorerUrl, test } from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SHEET_QUERY = "(max-width: 47.99rem), (max-height: 32rem)";

const read = (name: string): unknown => JSON.parse(readFileSync(new URL(`../public/data/${name}`, import.meta.url), "utf8"));
const catalog = read("catalog.json") as { stars: [number, number, number, number][] };
const segmentsFile = read("constellations.json") as { segments: [string, string, number, number][] };
const namesFile = read("names.json") as { names: [number, string][] };
const scene = prepareScene(
  catalog.stars.map(([hip, raDeg, decDeg, mag]) => ({ hip, raDeg, decDeg, mag })),
  segmentsFile.segments,
  namesFile.names,
);
const view = prepareObserverView(scene, {
  latDeg: BASE_EXPLORER.lat,
  lonDeg: BASE_EXPLORER.lon,
  when: new Date(BASE_EXPLORER.when_utc),
});

/** Labels off, so a point near a line can only hover that line's figure. */
const LINES_ONLY = { layers: { below: "dimmed" as const, constellationLabels: false } };

const canvasOf = (page: Page): Locator => page.getByRole("img", { name: /sky map|mapa do céu/i });
const tooltip = (page: Page): Locator => page.locator(".explorer-tooltip");
const status = (page: Page): Locator => page.getByRole("status", { name: "Map announcements" });
const memberList = (page: Page, name = "Stars in the figure"): Locator => page.getByRole("group", { name });

/** The two lines the tooltip should read for a figure, in en-US or pt-BR. */
function expectedLines(abbr: string, stars = "stars"): string[] {
  const tip = constellationTip(scene, `CON:${abbr}`);
  if (!tip) throw new Error(`no figure ${abbr}`);
  const first = `${tip.name} • ${String(tip.count)} ${stars}`;
  if (tip.named.length === 0) return [first];
  const names = tip.named.join(", ");
  return [first, tip.rest > 0 ? `${names} +${String(tip.rest)}` : names];
}

function distanceToSegment(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/** A point on a figure's line with no star near it and no other figure close by, in viewport pixels. */
function figurePoint(width: number, height: number): { x: number; y: number; abbr: string } {
  const camera = { orientation: lookAt(raDecToVec(SIRIUS.raDeg, SIRIUS.decDeg), [0, 0, 1]), fovDeg: BASE_EXPLORER.fov };
  const at = new Map<number, { x: number; y: number }>();
  for (const [hip, ra, dec] of catalog.stars) {
    const p = projectToViewport(camera, raDecToVec(ra, dec), width, height);
    if (p) at.set(hip, p);
  }
  const drawn = catalog.stars.filter((s) => s[3] <= BASE_EXPLORER.mag).map((s) => at.get(s[0])).filter((p) => p !== undefined);
  const segs = segmentsFile.segments.flatMap(([abbr, , a, b]) => {
    const pa = at.get(a);
    const pb = at.get(b);
    return pa && pb ? [{ abbr, pa, pb }] : [];
  });
  for (const s of segs) {
    const x = (s.pa.x + s.pb.x) / 2;
    const y = (s.pa.y + s.pb.y) / 2;
    if (x < 200 || x > width - 420 || y < 120 || y > height - 120) continue;
    if (drawn.some((p) => Math.hypot(p.x - x, p.y - y) < 30)) continue;
    if (segs.some((o) => o.abbr !== s.abbr && distanceToSegment(x, y, o.pa, o.pb) < 20)) continue;
    return { x, y, abbr: s.abbr };
  }
  throw new Error("no hoverable figure on screen");
}

async function open(page: Page, url: string): Promise<Locator> {
  await page.clock.install();
  await page.goto(url);
  const canvas = canvasOf(page);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  return canvas;
}

/** Open the Explorer on the figure's line, labels off, and rest the mouse there. */
async function restOnFigure(page: Page): Promise<{ x: number; y: number; abbr: string; canvas: Locator }> {
  const vp = page.viewportSize();
  if (!vp) throw new Error("no viewport");
  const point = figurePoint(vp.width, vp.height);
  const canvas = await open(page, explorerUrl(SIRIUS, LINES_ONLY));
  await page.mouse.move(point.x - 40, point.y - 60);
  await page.mouse.move(point.x, point.y);
  return { ...point, canvas };
}

async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box");
  return box;
}

const isSheet = (page: Page): Promise<boolean> => page.evaluate((q) => window.matchMedia(q).matches, SHEET_QUERY);

/**
 * The Explorer opens with its controls faded out, and a faded control takes no
 * pointer; a pointer move brings them back (as `wakeChrome`, in any language).
 * The clock is installed and never run here, so they stay.
 */
async function wake(page: Page): Promise<void> {
  const box = await boxOf(canvasOf(page));
  await page.mouse.move(box.x + 24, box.y + box.height * 0.55);
  await page.mouse.move(box.x + 30, box.y + box.height * 0.55 + 4);
  await expect(page.locator(".explorer-stage-inner")).toHaveAttribute("data-chrome", "visible");
}

/** The Explorer with a constellation selected and its panel open, on any screen. */
async function openSelected(page: Page, abbr: string): Promise<void> {
  await open(page, explorerUrl(SIRIUS, { sel: `CON:${abbr}` }));
  await wake(page);
  if (await isSheet(page)) await page.getByRole("button", { name: /Show details|Mostrar detalhes/ }).click();
  await expect(page.locator("#explorer-inspector-body")).toBeVisible();
}

test.describe("constellation tooltip", () => {
  test.skip(({ isMobile }) => isMobile, "a mouse is not the phone's pointer");

  test("appears after 1.5 s at the pointer with the name, the count and three named stars, and paints no frame", async ({ page }) => {
    const { x, y, abbr, canvas } = await restOnFigure(page);
    await page.clock.runFor(1400);
    await expect(tooltip(page)).toHaveCount(0);
    // The hover highlight has drawn its frame by now; the tooltip adds none.
    const frames = await canvas.getAttribute("data-frames");
    await page.clock.runFor(200);
    await expect(tooltip(page)).toBeVisible();
    await expect(tooltip(page).locator("p")).toHaveText(expectedLines(abbr));
    await expect(tooltip(page)).toHaveAttribute("aria-hidden", "true");
    expect(await tooltip(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    await expect(canvas).toHaveAttribute("data-frames", frames ?? "");
    // Beside the pointer, never under it, and inside the screen.
    const tip = await boxOf(tooltip(page));
    const vp = page.viewportSize();
    const underPointer = x >= tip.x - 4 && x <= tip.x + tip.width + 4 && y >= tip.y - 4 && y <= tip.y + tip.height + 4;
    expect(underPointer).toBe(false);
    expect(Math.hypot(tip.x - x, tip.y + tip.height / 2 - y)).toBeLessThan(60);
    expect(tip.x + tip.width).toBeLessThanOrEqual(vp?.width ?? 0);
    expect(tip.y + tip.height).toBeLessThanOrEqual(vp?.height ?? 0);
  });

  test("closes when the pointer leaves the figure, and does not open if it left early", async ({ page }) => {
    const { x, y } = await restOnFigure(page);
    await page.clock.runFor(1000);
    await page.mouse.move(x, y + 90);
    await page.clock.runFor(1000);
    await expect(tooltip(page)).toHaveCount(0);
    await page.mouse.move(x, y);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.mouse.move(x, y + 90);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test("a star under the pointer keeps its own tooltip", async ({ page }) => {
    const { canvas } = await restOnFigure(page);
    await page.clock.runFor(1600);
    await expect(tooltip(page).locator("p").first()).toContainText(" stars");
    // Sirius, at the centre, is part of a figure too: the star wins.
    const box = await boxOf(canvas);
    await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 2);
    await expect(tooltip(page)).toHaveCount(0);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toHaveText("Sirius • Magnitude -1.44");
  });

  test("Escape closes it first and leaves the selection; the next Escape clears it", async ({ page }) => {
    const { x, y, canvas } = await restOnFigure(page);
    const box = await boxOf(canvas);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await page.mouse.move(x, y);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip(page)).toHaveCount(0);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await canvas.focus();
    await page.keyboard.press("Escape");
    await expect(status(page)).toHaveText("Selection cleared.");
  });

  test("closes on a press and on the wheel", async ({ page }) => {
    const { x, y } = await restOnFigure(page);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.mouse.down();
    await expect(tooltip(page)).toHaveCount(0);
    await page.mouse.up();
    await page.mouse.move(x + 60, y + 90);
    await page.mouse.move(x, y);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.mouse.wheel(0, -50);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test("never appears for a touch pointer", async ({ page }) => {
    const vp = page.viewportSize();
    if (!vp) throw new Error("no viewport");
    const point = figurePoint(vp.width, vp.height);
    await open(page, explorerUrl(SIRIUS, LINES_ONLY));
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
    await page.clock.runFor(3000);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test.describe("in Portuguese", () => {
    test.use({ locale: "pt-BR" });

    test("counts the stars in Portuguese and leaves the names as they are", async ({ page }) => {
      const { abbr } = await restOnFigure(page);
      await page.clock.runFor(1600);
      await expect(tooltip(page).locator("p")).toHaveText(expectedLines(abbr, "estrelas"));
    });
  });
});

test.describe("stars in the figure", () => {
  test("lists Orion's stars brightest first, and an entry selects its star, link and all", async ({ page }) => {
    await openSelected(page, "Ori");
    const expected = figureStars(scene, view, "CON:Ori") ?? [];
    expect(expected.length).toBeGreaterThan(3);
    const list = memberList(page);
    await expect(list.locator(".explorer-member-name")).toHaveText(expected.map((s) => s.title));
    const below = expected.filter((s) => s.below).length;
    await expect(list.getByRole("button", { name: /below the horizon$/ })).toHaveCount(below);
    const second = expected[1];
    if (!second) throw new Error("Orion has fewer than two stars");
    await list.getByRole("button", { name: new RegExp(`^${second.title} magnitude`) }).click();
    await expect(status(page)).toHaveText(new RegExp(`^${second.title} selected`));
    await expect(page.getByRole("heading", { level: 2, name: second.title })).toBeFocused();
    await expect(memberList(page)).toHaveCount(0);
    await expect
      .poll(() => {
        const fragment = explorerFragmentFromHash(new URL(page.url()).hash);
        return fragment === null ? null : decodeExplorer(fragment).sel;
      })
      .toBe(second.id);
  });

  test("is reached with the keyboard, has 44 px targets, and Enter selects", async ({ page }) => {
    await openSelected(page, "Ori");
    const first = memberList(page).getByRole("button").first();
    for (const entry of await memberList(page).getByRole("button").all()) {
      expect((await boxOf(entry)).height).toBeGreaterThanOrEqual(44);
    }
    await first.focus();
    await page.keyboard.press("Tab");
    await expect(memberList(page).getByRole("button").nth(1)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(first).toBeFocused();
    expect(await first.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(status(page)).toHaveText(/ selected/);
  });

  test("has no serious or critical axe violations with the list open", async ({ page }) => {
    await openSelected(page, "Ori");
    await expect(memberList(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`).join("\n")).toBe("");
  });

  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`Eridanus's 30 stars scroll inside the panel, and the page does not scroll, at ${String(width)}x${String(height)}`, async ({ page }) => {
      test.skip(test.info().project.name === "mobile-chromium", "a desktop layout");
      await page.setViewportSize({ width, height });
      await openSelected(page, "Eri");
      const list = memberList(page).locator(".explorer-members");
      await expect(list.getByRole("button")).toHaveCount(30);
      const sizes = await list.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
      expect(sizes.scroll).toBeGreaterThan(sizes.client);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
      // The last star is still in reach.
      const last = list.getByRole("button").last();
      await last.scrollIntoViewIfNeeded();
      await last.click();
      await expect(status(page)).toHaveText(/ selected/);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    });
  }

  test.describe("in Portuguese", () => {
    test.use({ locale: "pt-BR" });

    test("is titled and marked in Portuguese", async ({ page }) => {
      await openSelected(page, "Ori");
      const list = memberList(page, "Estrelas na figura");
      await expect(list).toBeVisible();
      const expected = figureStars(scene, view, "CON:Ori") ?? [];
      await expect(list.locator(".explorer-member-name")).toHaveText(expected.map((s) => s.title));
      await expect(list.getByRole("button").first()).toHaveText(/ magnitude \d+,\d\d/);
      const below = expected.filter((s) => s.below).length;
      await expect(list.getByRole("button", { name: /abaixo do horizonte$/ })).toHaveCount(below);
    });
  });
});
