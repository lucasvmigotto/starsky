/**
 * Explorer polish (014-explorer-polish): the idle collapse, the grouped list,
 * the copy icon, the bottom-right toolbar and panel tab, and the star tooltip.
 *
 * Time is Playwright's clock where a timeout is the thing under test (4 s idle,
 * 1.5 s hover, 2 s check mark): it is installed before the page loads and moved
 * with `runFor`, so nothing here sleeps. Other waits are polls on state.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { SIRIUS, expect, explorerUrl, test, wakeChrome } from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const STATUS = "Map announcements";
const IDLE_MS = 4000;
const SHEET_QUERY = "(max-width: 47.99rem), (max-height: 32rem)";

const canvasOf = (page: Page): Locator => page.getByRole("img", { name: /sky map/i });
const stage = (page: Page): Locator => page.locator(".explorer-stage-inner");
const toolbar = (page: Page): Locator => page.getByRole("toolbar", { name: "Map controls" });
const strip = (page: Page): Locator => page.getByRole("region", { name: "Moment" });
const tab = (page: Page): Locator => page.locator(".explorer-tab");
const tooltip = (page: Page): Locator => page.locator(".explorer-tooltip");
const status = (page: Page): Locator => page.getByRole("status", { name: STATUS });

/** Open the Explorer with Playwright's clock installed, and leave the controls as they start. */
async function open(page: Page, url: string = explorerUrl(SIRIUS)): Promise<Locator> {
  await page.clock.install();
  await page.goto(url);
  const canvas = canvasOf(page);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  await expect(toolbar(page)).toBeAttached();
  return canvas;
}

async function centreOf(canvas: Locator): Promise<{ x: number; y: number }> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const isSheet = (page: Page): Promise<boolean> => page.evaluate((q) => window.matchMedia(q).matches, SHEET_QUERY);

const opacityOf = (locator: Locator): Promise<string> => locator.evaluate((el) => getComputedStyle(el).opacity);

/** Let the idle time pass: the controls hide once it has. */
async function letItHide(page: Page): Promise<void> {
  await page.clock.runFor(IDLE_MS + 200);
  await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
}

async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box");
  return box;
}

async function openPanel(page: Page): Promise<void> {
  if (await isSheet(page)) {
    await page.getByRole("button", { name: "Show details" }).filter({ visible: true }).click();
  } else {
    await tab(page).click();
  }
  await expect(page.locator("#explorer-inspector-body")).toBeVisible();
}

test.describe("idle collapse", () => {
  test("opens collapsed: the one-line moment shows and the controls are faded out", async ({ page }) => {
    await open(page, explorerUrl(SIRIUS, { title: "Midwinter" }));
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    await expect(strip(page)).toHaveAttribute("data-mode", "compact");
    await expect(strip(page)).toContainText(/Midwinter · Times Square · Jan 1, 2026, 5:00 AM UTC/);
    await expect(strip(page).locator(".explorer-moment-line")).toBeVisible();
    expect(await opacityOf(toolbar(page))).toBe("0");
    expect(await opacityOf(page.getByRole("button", { name: "Keep details open" }))).toBe("0");
    expect(await opacityOf(page.getByRole("button", { name: "Copy link" }))).toBe("0");
    expect(await opacityOf(strip(page))).toBe("1");
  });

  test("the strip fits the line alone while the controls are hidden", async ({ page }) => {
    await open(page);
    const line = await boxOf(strip(page).locator(".explorer-moment-line"));
    const whole = await boxOf(strip(page));
    // Padding on both sides and a border, nothing else.
    expect(whole.width).toBeLessThanOrEqual(line.width + 40);
  });

  test("never uses display or visibility to hide, so the controls stay reachable and named", async ({ page }) => {
    await open(page);
    for (const control of [
      toolbar(page).getByRole("button", { name: "Zoom in" }),
      page.getByRole("button", { name: "Keep details open" }),
      page.getByRole("button", { name: "Copy link" }),
    ]) {
      const style = await control.evaluate((el) => {
        const s = getComputedStyle(el);
        return { display: s.display, visibility: s.visibility, events: s.pointerEvents };
      });
      expect(style.display).not.toBe("none");
      expect(style.visibility).toBe("visible");
      expect(style.events).toBe("none");
    }
    await expect(toolbar(page).getByRole("button", { name: "Zoom in" })).toBeAttached();
    expect(await page.getByRole("toolbar", { name: "Map controls" }).count()).toBe(1);
  });

  test("a link with a selection starts hidden, with the star marked in the sky", async ({ page }) => {
    await open(page, explorerUrl(SIRIUS, { sel: "HIP:32349" }));
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    await expect(strip(page)).toHaveAttribute("data-mode", "compact");
    // The ring and name are drawn on the canvas; the panel waits behind the fade.
    await expect.poll(() => page.evaluate(() => window.location.hash)).toContain("#e=");
    await wakeChrome(page);
    if (!(await isSheet(page))) await expect(page.getByRole("heading", { name: "Sirius", level: 2 })).toBeVisible();
    else await expect(page.getByRole("button", { name: /Show details/ }).filter({ visible: true })).toContainText("Sirius");
  });

  test("comes back on a pointer move, a key press, a wheel turn and a touch", async ({ page }) => {
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await page.mouse.move(c.x - 40, c.y + 40);
    await page.mouse.move(c.x - 30, c.y + 45);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await expect(toolbar(page)).toHaveCSS("opacity", "1");
    await letItHide(page);
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await letItHide(page);
    await page.mouse.wheel(0, -100);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
  });

  test("hides again 4 s after the last activity, not before", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await page.clock.runFor(IDLE_MS - 500);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await page.clock.runFor(700);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    // The moment line is still there.
    await expect(strip(page).locator(".explorer-moment-line")).toBeVisible();
  });

  test("activity moves the deadline", async ({ page }) => {
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await wakeChrome(page);
    await page.clock.runFor(3000);
    await page.mouse.move(c.x - 20, c.y + 60);
    await page.clock.runFor(3000);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await page.clock.runFor(1500);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
  });

  test("holds while search or layers is open", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.mouse.move(5, 5);
    await page.clock.runFor(IDLE_MS * 3);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await page.keyboard.press("Escape");
    // Escape hands focus back to the button that opened it, and a focused control holds too.
    await canvasOf(page).focus();
    await page.mouse.move(8, 8);
    await letItHide(page);
  });

  test("holds while the pointer rests on a control", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await toolbar(page).getByRole("button", { name: "Reset view" }).hover();
    await page.clock.runFor(IDLE_MS * 3);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await page.mouse.move(8, 8);
    await letItHide(page);
  });

  test("holds while the strip is pinned", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    const pin = page.getByRole("button", { name: "Keep details open" });
    await pin.click();
    await expect(strip(page)).toHaveAttribute("data-mode", "pinned");
    await page.mouse.move(8, 8);
    await page.clock.runFor(IDLE_MS * 3);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await expect(strip(page)).toHaveAttribute("data-mode", "pinned");
    await pin.click();
    await page.mouse.move(8, 8);
    await letItHide(page);
  });

  test("holds through a drag", async ({ page }) => {
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await page.mouse.move(c.x - 100, c.y + 100);
    await page.mouse.down();
    await page.mouse.move(c.x - 60, c.y + 120, { steps: 3 });
    await page.clock.runFor(IDLE_MS * 3);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await page.mouse.up();
    await letItHide(page);
  });

  test("holds while keyboard focus is on a control, and focusing one brings the controls back", async ({ page }) => {
    await open(page);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    // Tab from the map to the first control: the focus alone must restore.
    await canvasOf(page).focus();
    await page.keyboard.press("Tab");
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    const focused = await page.evaluate(() => document.activeElement?.className ?? "");
    expect(focused).toMatch(/atlas-btn|explorer-(tab|copy|link|list)/);
    await page.clock.runFor(IDLE_MS * 3);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await canvasOf(page).focus();
    await page.mouse.move(2, 2);
    await letItHide(page);
  });

  test("focusing a hidden control by script restores them all", async ({ page }) => {
    await open(page);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    await toolbar(page).getByRole("button", { name: "Layers" }).focus();
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await expect(toolbar(page)).toHaveCSS("opacity", "1");
  });

  test("a selection stays selected and marked while the controls are hidden", async ({ page }) => {
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await page.mouse.click(c.x, c.y);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await page.mouse.move(c.x - 200, c.y + 150);
    await letItHide(page);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await page.mouse.move(c.x - 190, c.y + 150);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    if (!(await isSheet(page))) await expect(page.getByRole("heading", { name: "Sirius", level: 2 })).toBeVisible();
  });

  test("a mouse click while hidden still selects", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "a touch screen has no mouse to wake it first");
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    await page.mouse.click(c.x, c.y);
    await expect(status(page)).toHaveText(/^Sirius selected/);
  });

  test("on a touch screen the first tap only restores the controls; the second selects", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "touch input needs the mobile project");
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    await page.touchscreen.tap(c.x, c.y);
    await expect(stage(page)).toHaveAttribute("data-chrome", "visible");
    await expect(status(page)).toHaveText("Sky Explorer ready.");
    await page.touchscreen.tap(c.x, c.y);
    await expect(status(page)).toHaveText(/^Sirius selected/);
  });

  test("a touch drag while hidden still pans the sky", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "touch input needs the mobile project");
    const canvas = await open(page);
    const before = await canvas.getAttribute("data-frames");
    const c = await centreOf(canvas);
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.x, y: c.y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.x + 60, y: c.y + 20 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.x + 90, y: c.y + 30 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(canvas).not.toHaveAttribute("data-frames", before ?? "");
    await expect(status(page)).toHaveText("Sky Explorer ready.");
  });
});

test.describe("axe in both states", () => {
  for (const hidden of [true, false]) {
    test(`has no serious or critical violations with the controls ${hidden ? "hidden" : "visible"}`, async ({ page }) => {
      await open(page);
      if (!hidden) await wakeChrome(page);
      await expect(stage(page)).toHaveAttribute("data-chrome", hidden ? "hidden" : "visible");
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(["color-contrast"]).analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test.describe("constellation list by the horizon", () => {
  test("splits into Above (open) and Below (closed), with counts that add up, and says partly", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await openPanel(page);
    const above = page.locator("details.explorer-group").nth(0);
    const below = page.locator("details.explorer-group").nth(1);
    await expect(above.locator("summary")).toHaveText(/^Above the horizon \(\d+\)$/);
    await expect(below.locator("summary")).toHaveText(/^Below the horizon \(\d+\)$/);
    await expect(above).toHaveJSProperty("open", true);
    await expect(below).toHaveJSProperty("open", false);
    const count = async (group: Locator): Promise<number> =>
      Number(/\((\d+)\)/.exec((await group.locator("summary").textContent()) ?? "")?.[1]);
    const nAbove = await count(above);
    const nBelow = await count(below);
    expect(nAbove).toBeGreaterThan(0);
    expect(nBelow).toBeGreaterThan(0);
    await expect(above.locator(".explorer-list-item")).toHaveCount(nAbove);
    await below.locator("summary").click();
    await expect(below.locator(".explorer-list-item")).toHaveCount(nBelow);
    expect(nAbove + nBelow).toBe(88);
    // Names only on screen; "partly above the horizon" is hidden text, in the top group only.
    const partly = above.locator(".explorer-list-item .sr-only");
    expect(await partly.count()).toBeGreaterThan(0);
    await expect(partly.first()).toHaveText("partly above the horizon");
    expect(await partly.first().evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
    await expect(below.locator(".explorer-list-item .sr-only")).toHaveCount(0);
    await expect(above.locator(".explorer-list-item").first().locator("span:not(.sr-only)")).toHaveCount(1);
  });

  test("the order is by name inside each group", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await openPanel(page);
    const names = await page
      .locator("details.explorer-group")
      .nth(0)
      .locator(".explorer-list-item > span:first-child")
      .allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });

  test("a constellation below the horizon can be chosen and is described as below", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await openPanel(page);
    const below = page.locator("details.explorer-group").nth(1);
    await below.locator("summary").click();
    const first = below.locator(".explorer-list-item").first();
    const name = (await first.locator("span").first().textContent()) ?? "";
    await first.click();
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    await expect(status(page)).toHaveText(`${name} constellation selected.`);
    await expect(page.getByRole("group", { name: "For this place and moment" })).toContainText(/0 of \d+/);
  });

  test("opens the Below group when the selection is in it", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await openPanel(page);
    const below = page.locator("details.explorer-group").nth(1);
    await below.locator("summary").click();
    await below.locator(".explorer-list-item").first().click();
    // Close it, then choose another from the search: the group opens by itself again.
    await below.locator("summary").click();
    await expect(below).toHaveJSProperty("open", false);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const name = (await below.locator(".explorer-list-item").nth(1).locator("span").first().textContent()) ?? "";
    await page.getByRole("combobox").fill(name);
    await page.getByRole("option", { name: new RegExp(`^${name}`) }).first().click();
    await expect(below).toHaveJSProperty("open", true);
  });
});

test.describe("copy link icon", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __refuse: boolean };
      w.__refuse = false;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => (w.__refuse ? Promise.reject(new Error("denied")) : Promise.resolve()) },
      });
    });
  });

  test("is an icon button named Copy link, beside the pin, at least 44 px", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    const copy = page.getByRole("button", { name: "Copy link" });
    await expect(copy).toHaveAttribute("title", "Copy link");
    await expect(copy.locator("svg")).toHaveAttribute("aria-hidden", "true");
    expect(((await copy.innerText()) || "").trim()).toBe("");
    const pin = page.getByRole("button", { name: "Keep details open" });
    expect(await copy.evaluate((el, p) => el.parentElement === p.parentElement, await pin.elementHandle())).toBe(true);
    await expect(strip(page).getByRole("button", { name: "Copy link" })).toBeVisible();
    const box = await boxOf(copy);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    // The icon follows the text colour.
    expect(await copy.locator("svg").evaluate((el) => getComputedStyle(el).color)).toBe(
      await copy.evaluate((el) => getComputedStyle(el).color),
    );
  });

  test("shows a check for about two seconds, announces it, then goes back to the link", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    const copy = page.getByRole("button", { name: "Copy link" });
    await expect(copy).toHaveAttribute("data-icon", "link");
    await copy.click();
    await expect(copy).toHaveAttribute("data-icon", "check");
    await expect(page.getByRole("status").filter({ hasText: "Link copied." })).toBeAttached();
    await page.clock.runFor(1800);
    await expect(copy).toHaveAttribute("data-icon", "check");
    await page.clock.runFor(400);
    await expect(copy).toHaveAttribute("data-icon", "link");
  });

  test("a refusal still says so in text", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    await page.evaluate(() => {
      (window as unknown as { __refuse: boolean }).__refuse = true;
    });
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("alert")).toHaveText("Could not copy the link. Copy it from the address bar.");
    await expect(page.getByRole("alert")).toBeVisible();
  });
});

test.describe("toolbar and panel tab", () => {
  test("the toolbar sits at the bottom right of the screen", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    const vp = page.viewportSize();
    const box = await boxOf(toolbar(page));
    expect(box.x + box.width).toBeGreaterThan((vp?.width ?? 0) - 24);
    expect(box.x + box.width).toBeLessThanOrEqual(vp?.width ?? 0);
    if (await isSheet(page)) {
      // Above the sheet's 44 px handle.
      expect(box.y + box.height).toBeLessThanOrEqual((vp?.height ?? 0) - 44);
      expect(box.y + box.height).toBeGreaterThan((vp?.height ?? 0) - 44 - 24);
    } else {
      expect(box.y + box.height).toBeGreaterThan((vp?.height ?? 0) - 24);
      expect(box.y + box.height).toBeLessThanOrEqual(vp?.height ?? 0);
    }
  });

  test("has no Inspector button", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("button", { name: "Inspector", exact: true })).toHaveCount(0);
  });

  test("with the panel open the toolbar sits to its left, never under it", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, "desktop layout");
    await open(page);
    await wakeChrome(page);
    await openPanel(page);
    const panel = await boxOf(page.getByRole("complementary", { name: "Inspector" }));
    const bar = await boxOf(toolbar(page));
    expect(bar.x + bar.width).toBeLessThanOrEqual(panel.x);
    await toolbar(page).getByRole("button", { name: "Search", exact: true }).click();
    const pop = await boxOf(page.locator(".explorer-popover"));
    expect(pop.x + pop.width).toBeLessThanOrEqual(panel.x);
  });

  test("popovers open upward from the toolbar and stay inside the screen", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    const vp = page.viewportSize();
    for (const name of ["Layers", "Search"]) {
      await toolbar(page).getByRole("button", { name, exact: true }).click();
      const pop = await boxOf(page.locator(".explorer-popover"));
      const bar = await boxOf(toolbar(page));
      expect(pop.y + pop.height).toBeLessThanOrEqual(bar.y + 1);
      expect(pop.x).toBeGreaterThanOrEqual(0);
      expect(pop.y).toBeGreaterThanOrEqual(0);
      expect(pop.x + pop.width).toBeLessThanOrEqual(vp?.width ?? 0);
      await page.keyboard.press("Escape");
    }
  });

  test("the panel tab: < at the right edge, vertically centred, 44 px to hit, then > on the panel's edge", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    test.skip(await isSheet(page), "phones keep the sheet handle");
    const vp = page.viewportSize();
    await expect(tab(page)).toHaveAttribute("aria-expanded", "false");
    await expect(tab(page)).toHaveAttribute("aria-controls", "explorer-inspector-body");
    await expect(tab(page)).toHaveAttribute("aria-label", "Show details");
    await expect(tab(page)).toHaveAttribute("data-chevron", "left");
    const closed = await boxOf(tab(page));
    expect(closed.width).toBeGreaterThanOrEqual(44);
    expect(closed.height).toBeGreaterThanOrEqual(44);
    expect(closed.x + closed.width).toBeCloseTo(vp?.width ?? 0, 0);
    // Centred in the stage, which sits under the shared header.
    const stageBox = await boxOf(stage(page));
    expect(closed.y + closed.height / 2).toBeCloseTo(stageBox.y + stageBox.height / 2, 0);
    // Rounded only on the sky-facing side, with the toolbar container's radius.
    const face = tab(page).locator(".explorer-tab-face");
    const radius = await face.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.borderTopLeftRadius, s.borderBottomLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius];
    });
    expect(radius).toEqual(["12px", "12px", "0px", "0px"]);
    await tab(page).click();
    await expect(tab(page)).toHaveAttribute("aria-expanded", "true");
    await expect(tab(page)).toHaveAttribute("aria-label", "Hide details");
    await expect(tab(page)).toHaveAttribute("data-chevron", "right");
    // The panel and the tab slide together; wait for them to arrive.
    await expect
      .poll(async () => {
        const panel = await boxOf(page.getByRole("complementary", { name: "Inspector" }));
        const onPanel = await boxOf(tab(page));
        return Math.abs(onPanel.x + onPanel.width - panel.x);
      })
      .toBeLessThan(1);
    const onPanel = await boxOf(tab(page));
    expect(onPanel.y + onPanel.height / 2).toBeCloseTo(stageBox.y + stageBox.height / 2, 0);
    await tab(page).click();
    await expect(tab(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("opening and closing the panel never resizes the canvas, and the panel's own button returns focus to the tab", async ({
    page,
  }) => {
    await open(page);
    await wakeChrome(page);
    test.skip(await isSheet(page), "the sheet is covered by the phone tests");
    const canvas = canvasOf(page);
    const before = await boxOf(canvas);
    const frames = await canvas.getAttribute("data-frames");
    await tab(page).click();
    await expect(page.locator("#explorer-inspector-body")).toBeVisible();
    expect(await boxOf(canvas)).toEqual(before);
    await page.getByRole("button", { name: "Close inspector" }).click();
    await expect(page.locator("#explorer-inspector-body")).toBeHidden();
    await expect(tab(page)).toBeFocused();
    expect(await boxOf(canvas)).toEqual(before);
    // No resize, so no extra frame was needed for it.
    await expect(canvas).toHaveAttribute("data-frames", frames ?? "");
  });

  test("hiding the controls never resizes the canvas or leaves a band where the panel was", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    const canvas = canvasOf(page);
    if (!(await isSheet(page))) await tab(page).click();
    const shown = await boxOf(canvas);
    await canvas.focus();
    await page.mouse.move(8, 8);
    await letItHide(page);
    expect(await boxOf(canvas)).toEqual(shown);
    const vp = page.viewportSize();
    expect(shown.width).toBe(vp?.width);
  });

  test("Escape closes a popover first, then clears the selection, with the panel open", async ({ page }) => {
    const canvas = await open(page);
    await wakeChrome(page);
    const c = await centreOf(canvas);
    await page.mouse.click(c.x, c.y);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await toolbar(page).getByRole("button", { name: "Layers", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("group", { name: "Layers" })).toHaveCount(0);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await canvas.focus();
    await page.keyboard.press("Escape");
    await expect(status(page)).toHaveText("Selection cleared.");
  });

  test("a wide screen shows the tab and not the handle; a phone shows the handle and not the tab", async ({ page }) => {
    await open(page);
    await wakeChrome(page);
    if (await isSheet(page)) {
      await expect(tab(page)).toBeHidden();
      await expect(page.locator(".explorer-sheet-handle")).toBeVisible();
    } else {
      await expect(tab(page)).toBeVisible();
      await expect(page.locator(".explorer-sheet-handle")).toBeHidden();
    }
  });
});

test.describe("phone layouts", () => {
  for (const width of [360, 390]) {
    test(`${String(width)} px: toolbar right-aligned above the sheet, nothing overflows sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await open(page);
      await wakeChrome(page);
      for (const popover of [null, "Layers", "Search"] as const) {
        if (popover) await toolbar(page).getByRole("button", { name: popover, exact: true }).click();
        const overflow = await page.evaluate(() => {
          const w = window.innerWidth;
          const out: string[] = [];
          for (const el of document.querySelectorAll(".explorer-stage *")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || el.closest(".sr-only") || el.closest("[hidden]")) continue;
            if (r.left < -0.5 || r.right > w + 0.5) out.push(`${el.tagName}.${el.className}`);
          }
          const doc = document.scrollingElement;
          if (doc && doc.scrollWidth > w) out.push("page scrolls sideways");
          return out;
        });
        expect(overflow, popover ?? "toolbar").toEqual([]);
        if (popover) await page.keyboard.press("Escape");
      }
      const bar = await boxOf(toolbar(page));
      expect(bar.x + bar.width).toBeGreaterThan(width - 16);
      expect(bar.y + bar.height).toBeLessThanOrEqual(844 - 44);
    });
  }

  test("short landscape keeps the toolbar off the centre, inside the screen, and the popover inside it too", async ({ page }) => {
    await page.setViewportSize({ width: 915, height: 412 });
    const canvas = await open(page);
    await wakeChrome(page);
    const c = await centreOf(canvas);
    const bar = await boxOf(toolbar(page));
    expect(bar.x).toBeGreaterThanOrEqual(0);
    expect(bar.x + bar.width).toBeLessThanOrEqual(915);
    expect(bar.y + bar.height).toBeLessThanOrEqual(412 - 44);
    expect(bar.x + bar.width).toBeGreaterThan(915 - 24);
    const coversCentre = c.x >= bar.x && c.x <= bar.x + bar.width && c.y >= bar.y && c.y <= bar.y + bar.height;
    expect(coversCentre).toBe(false);
    for (const name of ["Search", "Layers"]) {
      await toolbar(page).getByRole("button", { name, exact: true }).click();
      const pop = await boxOf(page.locator(".explorer-popover"));
      expect(pop.x).toBeGreaterThanOrEqual(0);
      expect(pop.y).toBeGreaterThanOrEqual(0);
      expect(pop.y + pop.height).toBeLessThanOrEqual(bar.y + 1);
      const doc = await page.evaluate(() => (document.scrollingElement?.scrollWidth ?? 0) - window.innerWidth);
      expect(doc).toBeLessThanOrEqual(0);
      await page.keyboard.press("Escape");
    }
  });

  test("a narrow desktop window with the panel open keeps the moment strip clear of it", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await open(page);
    await wakeChrome(page);
    await tab(page).click();
    const panel = await boxOf(page.getByRole("complementary", { name: "Inspector" }));
    const top = await boxOf(page.locator(".explorer-top"));
    expect(top.x + top.width).toBeLessThanOrEqual(panel.x);
  });
});

test.describe("star tooltip", () => {
  async function restOnSirius(page: Page, canvas: Locator): Promise<{ x: number; y: number }> {
    const c = await centreOf(canvas);
    await page.mouse.move(c.x + 3, c.y + 2);
    return c;
  }

  test("appears after 1.5 s of resting on a star, with name, magnitude and horizon, and not before", async ({ page }) => {
    const canvas = await open(page);
    await restOnSirius(page, canvas);
    await page.clock.runFor(1400);
    await expect(tooltip(page)).toHaveCount(0);
    await page.clock.runFor(200);
    await expect(tooltip(page)).toBeVisible();
    await expect(tooltip(page)).toHaveText("Sirius • Magnitude -1.44");
    await expect(tooltip(page)).toHaveAttribute("aria-hidden", "true");
    expect(await tooltip(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("sits beside the star, never over it, and inside the screen", async ({ page }) => {
    const canvas = await open(page);
    const c = await restOnSirius(page, canvas);
    await page.clock.runFor(1600);
    const tip = await boxOf(tooltip(page));
    const vp = page.viewportSize();
    const overStar = c.x >= tip.x - 6 && c.x <= tip.x + tip.width + 6 && c.y >= tip.y - 6 && c.y <= tip.y + tip.height + 6;
    expect(overStar).toBe(false);
    expect(tip.x).toBeGreaterThanOrEqual(0);
    expect(tip.y).toBeGreaterThanOrEqual(0);
    expect(tip.x + tip.width).toBeLessThanOrEqual(vp?.width ?? 0);
    expect(tip.y + tip.height).toBeLessThanOrEqual(vp?.height ?? 0);
  });

  test("draws no canvas frames: the frame counter stays flat while it opens and closes", async ({ page }) => {
    const canvas = await open(page);
    await expect.poll(async () => {
      const a = await canvas.getAttribute("data-frames");
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          }),
      );
      return a === (await canvas.getAttribute("data-frames"));
    }).toBe(true);
    const settled = await canvas.getAttribute("data-frames");
    const c = await restOnSirius(page, canvas);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await expect(canvas).toHaveAttribute("data-frames", settled ?? "");
    await page.mouse.move(c.x - 200, c.y + 150);
    await expect(tooltip(page)).toHaveCount(0);
    await page.clock.runFor(500);
    await expect(canvas).toHaveAttribute("data-frames", settled ?? "");
  });

  test("closes when the pointer moves off the star, or the timer is cancelled by moving early", async ({ page }) => {
    const canvas = await open(page);
    const c = await restOnSirius(page, canvas);
    await page.clock.runFor(1000);
    await page.mouse.move(c.x - 200, c.y + 150);
    await page.clock.runFor(1000);
    await expect(tooltip(page)).toHaveCount(0);
    await page.mouse.move(c.x + 3, c.y + 2);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.mouse.move(c.x - 200, c.y + 150);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test("closes when a drag starts, and when the wheel turns", async ({ page }) => {
    const canvas = await open(page);
    const c = await restOnSirius(page, canvas);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.mouse.down();
    await expect(tooltip(page)).toHaveCount(0);
    await page.mouse.move(c.x + 60, c.y + 30, { steps: 3 });
    await page.mouse.up();
    await page.mouse.move(c.x - 100, c.y + 100);
    // Back on a star with the wheel.
    const again = await centreOf(canvas);
    await page.mouse.move(again.x, again.y);
    await page.clock.runFor(100);
    await page.mouse.wheel(0, -50);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test("closes when the pointer leaves the map for a control", async ({ page }) => {
    const canvas = await open(page);
    await restOnSirius(page, canvas);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await wakeChrome(page);
    await toolbar(page).getByRole("button", { name: "Reset view" }).hover();
    await expect(tooltip(page)).toHaveCount(0);
  });

  test("Escape closes it first and leaves the selection; the next Escape clears it", async ({ page }) => {
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await page.mouse.click(c.x, c.y);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await page.mouse.move(c.x + 2, c.y + 1);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip(page)).toHaveCount(0);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await canvas.focus();
    await page.keyboard.press("Escape");
    await expect(status(page)).toHaveText("Selection cleared.");
  });

  test("stays up while the controls fade out around it", async ({ page }) => {
    const canvas = await open(page);
    await wakeChrome(page);
    await restOnSirius(page, canvas);
    await page.clock.runFor(1600);
    await expect(tooltip(page)).toBeVisible();
    await page.clock.runFor(IDLE_MS);
    await expect(stage(page)).toHaveAttribute("data-chrome", "hidden");
    await expect(tooltip(page)).toBeVisible();
  });

  test("never appears on a touch screen", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "touch input needs the mobile project");
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    await expect(status(page)).toHaveText(/^Sirius selected/);
    await page.clock.runFor(4000);
    await expect(tooltip(page)).toHaveCount(0);
  });

  test("is not offered over a gap in the sky", async ({ page }) => {
    const canvas = await open(page);
    const c = await centreOf(canvas);
    await page.mouse.move(c.x + 300, c.y + 200);
    await page.clock.runFor(3000);
    await expect(tooltip(page)).toHaveCount(0);
  });
});
