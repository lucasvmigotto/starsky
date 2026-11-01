/**
 * Sky Explorer interface (011-explorer-ui): inspector, search, metadata,
 * toolbar, layers, responsive layout and the link that follows the view.
 *
 * Waits are polls on observable state; the one exception is the negative timing
 * check (pinned stays pinned), which has to let the idle time pass. Nothing here contacts a third party.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { rotate } from "../src/lib/sky/quat.ts";
import { type ExplorerPayload, decodeExplorer, explorerFragmentFromHash } from "../src/lib/sky/payload.ts";
import { angularDistanceDeg, raDecToVec } from "../src/lib/sky/vec.ts";
import { SIRIUS, expect, explorerUrl, test, wakeChrome } from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const STATUS = "Map announcements";

function canvasOf(page: Page): Locator {
  return page.getByRole("img", { name: /sky map/i });
}

async function openExplorer(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  const canvas = canvasOf(page);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  await expect(page.getByRole("toolbar", { name: "Map controls" })).toBeVisible();
  await wakeChrome(page);
  return canvas;
}

async function centreOf(canvas: Locator): Promise<{ x: number; y: number }> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function hashOf(page: Page): Promise<string> {
  return page.evaluate(() => window.location.hash);
}

async function payloadOf(page: Page): Promise<ExplorerPayload> {
  const fragment = explorerFragmentFromHash(await hashOf(page));
  if (fragment === null) throw new Error("the address no longer holds a #e= link");
  return decodeExplorer(fragment);
}

/** Phone viewports have the inspector as a sheet; the toolbar has no toggle there. */
async function isSheet(page: Page): Promise<boolean> {
  return page.evaluate(() => window.matchMedia("(max-width: 47.99rem), (max-height: 32rem)").matches);
}

async function selectSiriusByClick(page: Page, canvas: Locator): Promise<void> {
  const c = await centreOf(canvas);
  await page.mouse.click(c.x, c.y);
  await expect(page.getByRole("status", { name: STATUS })).toHaveText(/^Sirius selected/);
}

test.describe("explorer interface: inspector and search", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, "desktop layout");

  test("inspects a star: catalog facts apart from derived ones, in words and approximately", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    await selectSiriusByClick(page, canvas);
    await expect(page.getByRole("heading", { name: "Sirius", level: 2 })).toBeVisible();
    const catalog = page.getByRole("group", { name: "Catalog" });
    await expect(catalog).toContainText("HIP number");
    await expect(catalog).toContainText("32349");
    await expect(catalog).toContainText("Apparent magnitude");
    await expect(catalog).not.toContainText("Altitude");
    const derived = page.getByRole("group", { name: "For this place and moment" });
    await expect(derived).toContainText("Above the horizon");
    await expect(derived).toContainText(/Altitude\s*about -?\d+\.\d°/);
    await expect(derived).toContainText(/Azimuth\s*about \d+\.\d°/);
    await expect(derived).toContainText("Approximate, to 0.1°");
    await expect(page.getByRole("button", { name: "Part of the figure of Canis Major" })).toBeVisible();
  });

  test("inspects a constellation from the list and centers on it", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    await page.getByRole("button", { name: "Show details" }).click();
    await page
      .getByRole("list", { name: /Above the horizon/ })
      .getByRole("button", { name: /^Orion/ })
      .click();
    await expect(page.getByRole("heading", { name: "Orion", level: 2 })).toBeVisible();
    const catalog = page.getByRole("group", { name: "Catalog" });
    await expect(catalog).toContainText("IAU abbreviation");
    await expect(catalog).toContainText("Ori");
    await expect(catalog).toContainText("Stars in the figure");
    await expect(page.getByRole("group", { name: "For this place and moment" })).toContainText(/\d+ of \d+/);
    await expect(page.getByRole("status", { name: STATUS })).toHaveText("Orion constellation selected.");
    await expect(page.getByRole("button", { name: /^Orion/ })).toHaveAttribute("aria-current", "true");
  });

  test("search finds by name, ignoring case, and centers and selects the star", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl({ raDeg: 10, decDeg: 60 }, { fov: 30 }));
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.getByRole("combobox", { name: "Search constellations and stars" });
    await expect(input).toBeFocused();
    await input.fill("SIRIUS");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("status").filter({ hasText: "1 result." })).toBeVisible();
    await input.press("Enter");
    await expect(page.getByRole("status", { name: STATUS })).toHaveText(/^Sirius selected/);
    await expect(canvas).toBeFocused();
    await expect(page.getByRole("heading", { name: "Sirius", level: 2 })).toBeVisible();
    // The link follows the view: once settled, the camera looks at Sirius.
    await expect
      .poll(async () => {
        const payload = await payloadOf(page);
        const forward = rotate(payload.q, [0, 0, -1]);
        return payload.sel === "HIP:32349" && angularDistanceDeg(forward, raDecToVec(SIRIUS.raDeg, SIRIUS.decDeg)) < 0.5;
      })
      .toBe(true);
  });

  test("search finds a constellation by abbreviation and says when nothing matches", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.getByRole("combobox");
    await input.fill("uma");
    await expect(page.getByRole("option", { name: /Ursa Major/ })).toBeVisible();
    await input.fill("qqqqq");
    await expect(page.getByRole("status").filter({ hasText: "No matches." })).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test("the panel floats over the sky: the canvas keeps its size when it opens, and closing returns focus to the tab", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const before = await canvas.boundingBox();
    const toggle = page.getByRole("button", { name: "Show details" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const hide = page.getByRole("button", { name: "Hide details" });
    await expect(hide).toHaveAttribute("aria-expanded", "true");
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    await expect(inspector).toBeVisible();
    const width = (await inspector.boundingBox())?.width ?? 0;
    expect(width).toBeGreaterThanOrEqual(300);
    expect(width).toBeLessThanOrEqual(360);
    expect(await canvas.boundingBox()).toEqual(before);
    await page.getByRole("button", { name: "Close inspector" }).click();
    await expect(inspector).toBeHidden();
    await expect(page.getByRole("button", { name: "Show details" })).toBeFocused();
    expect(await canvas.boundingBox()).toEqual(before);
  });
});

test.describe("explorer interface: moment strip", () => {
  const strip = (page: Page): Locator => page.getByRole("region", { name: "Moment" });

  test("is expanded by activity, one line after idle time, and expands again on activity", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS, { title: "Midwinter", place: "Times Square" }));
    await expect(strip(page)).toHaveAttribute("data-mode", "expanded");
    await expect(strip(page)).toContainText("Midwinter");
    await expect(strip(page)).toContainText("Times Square");
    await expect(strip(page)).toHaveAttribute("data-mode", "compact", { timeout: 6000 });
    await expect(strip(page)).toContainText(/Midwinter · Times Square · Jan 1, 2026, 5:00 AM UTC/);
    // It never hides, and the page-visible text is whole in the accessibility tree.
    await expect(strip(page)).toBeVisible();
    const box = await canvas.boundingBox();
    await page.mouse.move((box?.x ?? 0) + 40, (box?.y ?? 0) + 200);
    await page.mouse.move((box?.x ?? 0) + 60, (box?.y ?? 0) + 220);
    await expect(strip(page)).toHaveAttribute("data-mode", "expanded");
  });

  test("a key press expands it again", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    await expect(strip(page)).toHaveAttribute("data-mode", "compact", { timeout: 6000 });
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(strip(page)).toHaveAttribute("data-mode", "expanded");
  });

  test("pinned stays expanded past the idle time", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    const pin = page.getByRole("button", { name: "Keep details open" });
    await pin.click();
    await expect(pin).toHaveAttribute("aria-pressed", "true");
    await expect(strip(page)).toHaveAttribute("data-mode", "pinned");
    // A negative that only time can prove: idle time (2.5 s) passes and nothing changes.
    await page.waitForTimeout(3200);
    await expect(strip(page)).toHaveAttribute("data-mode", "pinned");
    await pin.click();
    await expect(strip(page)).toHaveAttribute("data-mode", "expanded");
  });

  test("omits the title when the link has none", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    await expect(strip(page).locator(".explorer-moment-title")).toHaveCount(0);
    await expect(strip(page)).toContainText("Times Square");
  });
});

test.describe("explorer interface: toolbar and layers", () => {
  test("zoom buttons zoom, stop at the limits, and reset returns to the start", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const zoomIn = page.getByRole("button", { name: "Zoom in" });
    const zoomOut = page.getByRole("button", { name: "Zoom out" });
    await expect(zoomIn).toHaveAttribute("title", "Zoom in (+)");
    await zoomIn.click();
    await expect(canvas).toHaveAttribute("data-fov", "24.000");
    for (let i = 0; i < 12; i++) {
      if (await zoomIn.isDisabled()) break;
      await zoomIn.click();
    }
    await expect(zoomIn).toBeDisabled();
    await expect(canvas).toHaveAttribute("data-fov", "5.000");
    await expect(zoomOut).toBeEnabled();
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(canvas).toHaveAttribute("data-fov", "100.000");
    await expect(zoomIn).toBeEnabled();
  });

  test("layer switches change the sky and the link, and the link restores them after a reload", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Constellation lines" })).toBeFocused();
    await page.getByRole("checkbox", { name: "Horizon" }).uncheck();
    await page.getByRole("checkbox", { name: "Equatorial grid" }).check();
    await page.getByRole("radio", { name: "Hidden" }).check();
    await expect
      .poll(async () => {
        const { layers } = await payloadOf(page);
        return [layers["horizon"], layers["equatorialGrid"], layers["below"]];
      })
      .toEqual([false, true, "hidden"]);
    await page.reload();
    await expect(canvasOf(page)).toBeVisible();
    await wakeChrome(page);
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Horizon" })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Equatorial grid" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Hidden" })).toBeChecked();
  });

  test("Escape closes layers first, then clears the selection, and focus returns", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    await selectSiriusByClick(page, canvas);
    const layers = page.getByRole("button", { name: "Layers", exact: true });
    await layers.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("group", { name: "Layers" })).toHaveCount(0);
    await expect(layers).toBeFocused();
    await expect(page.getByRole("status", { name: STATUS })).toHaveText(/^Sirius selected/);
    await canvas.focus();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("status", { name: STATUS })).toHaveText("Selection cleared.");
  });
});

test.describe("explorer interface: the link follows the view", () => {
  test("rewrites the address once the view settles, in place, and a reload restores view and selection", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __writes: number; __hashchanges: number };
      w.__writes = 0;
      w.__hashchanges = 0;
      const original = history.replaceState.bind(history);
      history.replaceState = (...args: Parameters<History["replaceState"]>) => {
        w.__writes++;
        original(...args);
      };
      window.addEventListener("hashchange", () => {
        w.__hashchanges++;
      });
    });
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    const start = await hashOf(page);
    const historyLength = await page.evaluate(() => history.length);
    // The router writes once on mount; what counts is what the Explorer adds.
    const mounted = await page.evaluate(() => (window as unknown as { __writes: number }).__writes);
    const writes = async (): Promise<number> =>
      (await page.evaluate(() => (window as unknown as { __writes: number }).__writes)) - mounted;

    // Pointer moves alone write nothing.
    const c = await centreOf(canvas);
    for (let i = 0; i < 10; i++) await page.mouse.move(c.x + i * 5, c.y + i * 3);
    expect(await writes()).toBe(0);
    expect(await hashOf(page)).toBe(start);

    // Hold a drag: no write while the pointer is down.
    await page.mouse.down();
    await page.mouse.move(c.x + 120, c.y + 60, { steps: 6 });
    expect(await writes()).toBe(0);
    await page.mouse.up();
    await page.mouse.click(c.x, c.y);
    await page.mouse.wheel(0, -300);

    await expect.poll(async () => hashOf(page)).not.toBe(start);
    const hash = await hashOf(page);
    expect(hash.startsWith("#e=")).toBe(true);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    expect(await page.evaluate(() => (window as unknown as { __hashchanges: number }).__hashchanges)).toBe(0);
    const payload = await payloadOf(page);
    expect(payload.fov).toBeLessThan(30);

    await page.reload();
    await expect(canvasOf(page)).toBeVisible();
    await expect(canvasOf(page)).toHaveAttribute("data-fov", payload.fov.toFixed(3));
    expect(await hashOf(page)).toBe(hash);
    if (payload.sel !== null) {
      await expect(page.getByRole("heading", { name: /./, level: 2 }).first()).toBeVisible();
    }
  });

  test("a selection survives a reload and opens the inspector on a wide screen", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, "desktop layout");
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    await selectSiriusByClick(page, canvas);
    await expect.poll(async () => (await payloadOf(page)).sel).toBe("HIP:32349");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Sirius", level: 2 })).toBeVisible();
  });

  test("Copy link copies the current link and says so; a refusal is said plainly", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __copied: string | null; __refuse: boolean };
      w.__copied = null;
      w.__refuse = false;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (text: string) => {
            if (w.__refuse) return Promise.reject(new Error("denied"));
            w.__copied = text;
            return Promise.resolve();
          },
        },
      });
    });
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    await selectSiriusByClick(page, canvas);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
    const copied = await page.evaluate(() => (window as unknown as { __copied: string }).__copied);
    expect(copied).toContain("#e=");
    const fragment = explorerFragmentFromHash(copied.slice(copied.indexOf("#")));
    expect(decodeExplorer(fragment ?? "").sel).toBe("HIP:32349");
    await page.evaluate(() => {
      (window as unknown as { __refuse: boolean }).__refuse = true;
    });
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("alert")).toHaveText("Could not copy the link. Copy it from the address bar.");
  });
});

test.describe("explorer interface: keyboard only", () => {
  test("reaches search by Tab, finds a star, selects it and clears it, with a visible focus ring", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl({ raDeg: 10, decDeg: 60 }, { fov: 30 }));
    await canvas.focus();
    const search = page.getByRole("button", { name: "Search", exact: true });
    for (let i = 0; i < 14 && !(await search.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(search).toBeFocused();
    const ring = await search.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(ring).not.toBe("none");
    await page.keyboard.press("Enter");
    const input = page.getByRole("combobox");
    await expect(input).toBeFocused();
    await page.keyboard.type("sirius");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status", { name: STATUS })).toHaveText(/^Sirius selected/);
    await expect(canvas).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("status", { name: STATUS })).toHaveText("Selection cleared.");
  });
});

test.describe("explorer interface: accessibility", () => {
  test("has no serious or critical violations with the inspector, layers and a selection open", async ({ page }) => {
    const canvas = await openExplorer(page, explorerUrl(SIRIUS));
    await selectSiriusByClick(page, canvas);
    if (await isSheet(page)) await page.getByRole("button", { name: /Show details/ }).click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`).join("\n")).toBe("");
  });

  test("has none with search open", async ({ page }) => {
    await openExplorer(page, explorerUrl(SIRIUS));
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("combobox").fill("or");
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
  });
});

test.describe("explorer interface: phone layout", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1000) >= 768 && (viewport?.height ?? 1000) > 512, "phone viewports only");

  for (const [name, size] of [
    ["portrait", null],
    ["landscape", { width: 915, height: 412 }],
  ] as const) {
    test(`${name}: a labelled bottom sheet, 44 px targets, nothing overflowing, the centre uncovered`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile-chromium", "phone project only");
      if (size) await page.setViewportSize(size);
      const canvas = await openExplorer(page, explorerUrl(SIRIUS));
      expect(await isSheet(page)).toBe(true);

      const handle = page.getByRole("button", { name: /Show details/ });
      await expect(handle).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("button", { name: "Inspector", exact: true })).toHaveCount(0);

      const c = await centreOf(canvas);
      await page.touchscreen.tap(c.x, c.y);
      await expect(page.getByRole("status", { name: STATUS })).toHaveText(/^Sirius selected/);
      // A selection does not open the sheet over itself; the handle names it.
      await expect(handle).toHaveAttribute("aria-expanded", "false");
      await expect(handle).toContainText("Sirius");

      const coveredBy = (): Promise<string> =>
        page.evaluate(
          ([x, y]) => document.elementFromPoint(x, y)?.tagName ?? "none",
          [c.x, c.y] as const,
        );
      expect(await coveredBy()).toBe("CANVAS");

      await handle.click();
      const hide = page.getByRole("button", { name: /Hide details/ });
      await expect(hide).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("heading", { name: "Sirius", level: 2 })).toBeVisible();
      expect(await coveredBy()).toBe("CANVAS");

      const targets = [
        hide,
        page.getByRole("button", { name: "Zoom in" }),
        page.getByRole("button", { name: "Zoom out" }),
        page.getByRole("button", { name: "Reset view" }),
        page.getByRole("button", { name: "Layers", exact: true }),
        page.getByRole("button", { name: "Search", exact: true }),
        page.getByRole("button", { name: "Keep details open" }),
        page.getByRole("button", { name: "Copy link" }),
        page.getByRole("button", { name: "Center on map" }),
      ];
      for (const target of targets) {
        const box = await target.boundingBox();
        expect(box?.height ?? 0, await target.innerText()).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      }

      const overflow = await page.evaluate(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const out: string[] = [];
        for (const el of document.querySelectorAll(".explorer-stage *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || el.closest("[hidden]") || el.closest(".sr-only") || el.classList.contains("sr-only")) continue;
          const inScroller = el.closest(".explorer-inspector-body") !== null;
          if (r.left < -0.5 || r.right > w + 0.5) out.push(`${el.tagName}.${el.className} x ${String(r.left)}..${String(r.right)} of ${String(w)}`);
          if (!inScroller && (r.top < -0.5 || r.bottom > h + 0.5)) out.push(`${el.tagName}.${el.className} y ${String(r.top)}..${String(r.bottom)} of ${String(h)}`);
        }
        const doc = document.scrollingElement;
        if (doc && doc.scrollWidth > w) out.push(`page scrolls sideways: ${String(doc.scrollWidth)} > ${String(w)}`);
        return out;
      });
      expect(overflow).toEqual([]);

      await page.getByRole("button", { name: "Layers", exact: true }).click();
      await expect(page.getByRole("group", { name: "Layers" })).toBeVisible();
      await page.keyboard.press("Escape");
      await hide.click();
      await expect(handle).toHaveAttribute("aria-expanded", "false");
    });
  }
});

test("never contacts a third party", async ({ page, consoleErrors }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    requested.push(request.url());
  });
  await openExplorer(page, explorerUrl(SIRIUS));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("combobox").fill("sirius");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const host = new URL(page.url()).host;
  const foreign = requested.filter((url) => {
    const u = new URL(url);
    return u.protocol.startsWith("http") && u.host !== host;
  });
  expect(foreign).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
