/**
 * 015-visual-identity: icons, names-only list, the sliding panel, the image-only
 * Viewer and Studio, one header, and no sideways overflow on a phone.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import {
  SIRIUS,
  expect,
  explorerUrl,
  fragmentFor,
  openExport,
  pngSize,
  readDownload,
  studioUrl,
  test,
  viewerUrl,
  wakeChrome,
} from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// `color-contrast` is checked by contrast.spec.ts against computed colours; see a11y.spec.ts.
const analyze = (page: Page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(["color-contrast"]).analyze();

const stage = (page: Page): Locator => page.locator(".explorer-stage-inner");
const tab = (page: Page): Locator => page.locator(".explorer-tab");
const inspector = (page: Page): Locator => page.locator(".explorer-inspector");
const isSheet = (page: Page): Promise<boolean> =>
  page.evaluate(() => window.matchMedia("(max-width: 47.99rem), (max-height: 32rem)").matches);

async function openExplorer(page: Page, sel: string | null = null): Promise<void> {
  await page.goto(explorerUrl(SIRIUS, { sel }));
  await expect(page.getByRole("img", { name: /sky map/i })).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  await wakeChrome(page);
}

test.describe("icons", () => {
  test("the toolbar is six icon buttons in one row, named, titled, with no visible text", async ({ page }) => {
    await openExplorer(page);
    const toolbar = page.getByRole("toolbar", { name: "Map controls" });
    const names = ["Zoom in", "Zoom out", "Reset view", "Layers", "Search", "Create poster"];
    const boxes: { y: number; width: number; height: number }[] = [];
    for (const name of names) {
      const button = toolbar.getByRole("button", { name });
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAttribute("title", new RegExp(`^${name}`));
      await expect(button.locator("svg")).toHaveCount(1);
      expect((await button.innerText()).trim()).toBe("");
      const box = await button.boundingBox();
      if (!box) throw new Error(`${name} has no box`);
      boxes.push(box);
    }
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y).toBeCloseTo(boxes[0]?.y ?? 0, 0);
    }
  });

  test("the pin is a lock: open when unpinned, closed when pinned", async ({ page }) => {
    await openExplorer(page);
    const pin = page.getByRole("button", { name: "Keep details open" });
    await expect(pin).toHaveAttribute("title", "Keep details open");
    await expect(pin).toHaveAttribute("aria-pressed", "false");
    await expect(pin.locator("svg")).toHaveAttribute("data-icon", "lock-open");
    await pin.click();
    await expect(pin).toHaveAttribute("aria-pressed", "true");
    await expect(pin.locator("svg")).toHaveAttribute("data-icon", "lock-closed");
  });

  test("the inspector closes with a cross icon, still named Close inspector", async ({ page }) => {
    await openExplorer(page, "HIP:32349");
    if (await isSheet(page)) await page.getByRole("button", { name: "Show details" }).filter({ visible: true }).click();
    else if (!(await page.locator("#explorer-inspector-body").isVisible())) await tab(page).click();
    const close = page.getByRole("button", { name: "Close inspector" });
    await expect(close).toBeVisible();
    await expect(close).toHaveAttribute("title", "Close inspector");
    await expect(close.locator("svg")).toHaveAttribute("data-icon", "close");
    expect((await close.innerText()).trim()).toBe("");
  });
});

test.describe("the constellation list", () => {
  test("shows names only; partly above the horizon is for screen readers", async ({ page }) => {
    await openExplorer(page);
    if (await isSheet(page)) await page.getByRole("button", { name: "Show details" }).filter({ visible: true }).click();
    else await tab(page).click();
    await expect(page.locator("#explorer-inspector-body")).toBeVisible();
    const items = page.locator("details.explorer-group").first().locator(".explorer-list-item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 12); i += 1) {
      const item = items.nth(i);
      const visible = await item.evaluate((el) => {
        const text: string[] = [];
        for (const span of Array.from(el.querySelectorAll("span"))) {
          if (!span.classList.contains("sr-only")) text.push(span.textContent);
        }
        return text;
      });
      expect(visible).toHaveLength(1);
      expect(visible[0]).toMatch(/^[A-Za-zÀ-ÿ' ]{4,}$/);
    }
    const partly = page.locator(".explorer-list-item .sr-only");
    expect(await partly.count()).toBeGreaterThan(0);
    await expect(partly.first()).toHaveText("partly above the horizon");
    await expect(page.getByRole("button", { name: /partly above the horizon$/ }).first()).toBeAttached();
  });
});

test.describe("the side panel slides", () => {
  test("by transform with the panel motion, and the tab moves with it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openExplorer(page);
    test.skip(await isSheet(page), "the sheet has no slide");
    const closed = await inspector(page).evaluate((el) => {
      const s = getComputedStyle(el);
      return { transform: s.transform, property: s.transitionProperty, duration: s.transitionDuration, visibility: s.visibility };
    });
    expect(closed.transform).not.toBe("none");
    expect(closed.property).toContain("transform");
    expect(closed.duration).toContain("0.25s");
    expect(closed.visibility).toBe("hidden");

    await tab(page).click();
    await expect(stage(page).locator(".explorer-inspector")).toHaveAttribute("data-open", "true");
    // Sampled mid-way, the panel is neither at rest closed nor at rest open.
    const midway = await inspector(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const width = await inspector(page).evaluate((el) => el.getBoundingClientRect().width);
    expect(midway).toBeGreaterThanOrEqual(-1);
    expect(midway).toBeLessThanOrEqual(width + 1);
    await expect
      .poll(() => inspector(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41))
      .toBe(0);
    const panel = await inspector(page).boundingBox();
    const handle = await tab(page).boundingBox();
    if (!panel || !handle) throw new Error("no boxes");
    expect(handle.x + handle.width).toBeCloseTo(panel.x, 0);
    await expect(inspector(page)).toHaveCSS("visibility", "visible");

    await tab(page).click();
    await expect(inspector(page)).toHaveCSS("visibility", "hidden");
    await expect
      .poll(async () => (await tab(page).boundingBox())?.x ?? 0)
      .toBeGreaterThan((page.viewportSize()?.width ?? 0) - 60);
  });

  test("with reduced motion it jumps: no transition on the panel, the tab or the dock", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openExplorer(page);
    test.skip(await isSheet(page), "the sheet has no slide");
    for (const target of [inspector(page), tab(page), page.locator(".explorer-dock")]) {
      await expect(target).toHaveCSS("transition-duration", "0s");
    }
    await tab(page).click();
    // No frame between closed and open: the final transform is there at once.
    await expect(inspector(page)).toHaveCSS("visibility", "visible");
    const x = await inspector(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    expect(x).toBe(0);
  });

  test("the panel tab wears the toolbar container's surface, border and radius, not the accent", async ({ page }) => {
    await openExplorer(page);
    test.skip(await isSheet(page), "phones use the sheet handle");
    const [face, bar] = await Promise.all([
      page.locator(".explorer-tab-face").evaluate((el) => {
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, border: s.borderTopColor, radius: s.borderTopLeftRadius };
      }),
      page.getByRole("toolbar", { name: "Map controls" }).evaluate((el) => {
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, border: s.borderTopColor, radius: s.borderTopLeftRadius };
      }),
    ]);
    expect(face).toEqual(bar);
  });
});

test.describe("the Viewer is the image", () => {
  test("has no figures panel and no caption band on the page, while the PNG keeps its caption", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    const canvas = page.getByRole("img", { name: /night sky poster/i });
    await expect(canvas).toBeVisible();
    await expect(page.getByText("Figures in this sky")).toHaveCount(0);
    await expect(page.locator(".atlas-figure, .atlas-tooltip")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Constellation figures" })).toHaveCount(0);
    // The image is the square sky: no band rows beneath it.
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas box");
    expect(box.height / box.width).toBeCloseTo(1, 1);
    const backing = await canvas.evaluate((el) => ({ w: (el as HTMLCanvasElement).width, h: (el as HTMLCanvasElement).height }));
    expect(backing.h).toBe(backing.w);
    // Heading above the image, actions below it.
    const heading = await page.locator(".atlas-moment").boundingBox();
    const actions = await page.locator(".atlas-actions").boundingBox();
    if (!heading || !actions) throw new Error("no boxes");
    expect(heading.y + heading.height).toBeLessThanOrEqual(box.y);
    expect(actions.y).toBeGreaterThanOrEqual(box.y + box.height);
    // The image is centred.
    const vw = page.viewportSize()?.width ?? 0;
    expect(box.x + box.width / 2).toBeCloseTo(vw / 2, 0);

    // The export still carries the caption height: standard layout is 1.22 times as tall as wide.
    const download = page.waitForEvent("download");
    await openExport(page);
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    const { width, height } = pngSize(await readDownload(await download));
    expect(height / width).toBeCloseTo(1.22, 2);
  });
});

test.describe("the Viewer fits a wide screen (FR-011)", () => {
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`${width.toString()}x${height.toString()}: no vertical scroll, the image sized from the space left`, async ({ page }) => {
      test.skip(["mobile-chromium"].includes(test.info().project.name), "a desktop layout");
      await page.setViewportSize({ width, height });
      await page.goto(viewerUrl(fragmentFor()));
      const canvas = page.getByRole("img", { name: /night sky poster/i });
      await expect(canvas).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
      const fit = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, inner: window.innerHeight }));
      expect(fit.scroll).toBeLessThanOrEqual(fit.inner);
      const box = await canvas.boundingBox();
      if (!box) throw new Error("no canvas box");
      expect(box.height).toBeGreaterThan(height * 0.35);
      expect(box.width).toBeCloseTo(box.height, 0);
      const foot = await page.locator("footer").boundingBox();
      if (!foot) throw new Error("no footer box");
      expect(box.y + box.height).toBeLessThanOrEqual(foot.y);
      expect(foot.y + foot.height).toBeLessThanOrEqual(height + 1);
    });
  }
});

test.describe("the footer actions (FR-011)", () => {
  const surfaces: [string, () => string, string][] = [
    ["viewer", () => viewerUrl(fragmentFor()), "Explore this sky"],
    ["studio", () => studioUrl(fragmentFor()), "Return to Explorer"],
  ];
  for (const [name, url, third] of surfaces) {
    test(`${name}: icon buttons of one size on the right of the footer, popovers above, one at a time`, async ({ page }) => {
      await page.goto(url());
      await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
      const footer = page.locator("footer");
      const actions = footer.locator(".atlas-actions");
      await expect(actions).toBeVisible();
      const share = actions.locator("#share-trigger");
      const exp = actions.locator("#export-trigger");
      const other = actions.getByRole(name === "viewer" ? "button" : "link", { name: third });
      const must = async (l: Locator): Promise<{ x: number; y: number; width: number; height: number }> => {
        const box = await l.boundingBox();
        if (!box) throw new Error("no box");
        return box;
      };
      const boxes = [await must(share), await must(exp), await must(other)];
      for (const b of boxes) {
        expect(b.width).toBeCloseTo(44, 0);
        expect(b.height).toBeCloseTo(44, 0);
      }
      for (const l of [share, exp, other]) {
        await expect(l).toHaveAttribute("title", /.+/);
        await expect(l.locator("svg")).toHaveCount(1);
        expect((await l.innerText()).trim()).toBe("");
      }
      const vp = page.viewportSize();
      if (!vp) throw new Error("no viewport");
      const foot = await must(footer);
      // One row, vertically aligned, and on the right.
      expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
      const actionsBox = await must(actions);
      const right = actionsBox.x + actionsBox.width;
      expect(right).toBeGreaterThan(vp.width - 80);
      expect(boxes[0]?.y ?? 0).toBeGreaterThanOrEqual(foot.y);
      // On a phone the actions come before the version and attribution; on desktop they share a row.
      const info = await must(footer.locator(".atlas-footer-info"));
      if (vp.width < 768) expect(info.y).toBeGreaterThan((boxes[0]?.y ?? 0) + 40);
      else expect(Math.abs(info.y + info.height / 2 - ((boxes[0]?.y ?? 0) + 22))).toBeLessThan(60);

      // Share opens a popover above its button, inside the viewport.
      await expect(share).toHaveAttribute("aria-expanded", "false");
      await share.click();
      await expect(share).toHaveAttribute("aria-expanded", "true");
      await expect(share).toHaveAttribute("aria-controls", "share-details");
      const shareBox = await must(page.locator("#share-details"));
      expect(shareBox.y + shareBox.height).toBeLessThanOrEqual(boxes[0]?.y ?? 0);
      expect(shareBox.x).toBeGreaterThanOrEqual(0);
      expect(shareBox.x + shareBox.width).toBeLessThanOrEqual(vp.width);
      expect(shareBox.y).toBeGreaterThanOrEqual(0);
      // Opening Export closes Share.
      await exp.click();
      await expect(exp).toHaveAttribute("aria-expanded", "true");
      await expect(share).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("#share-details")).toBeHidden();
      const formats = await must(page.locator("#export-formats"));
      expect(formats.x).toBeGreaterThanOrEqual(0);
      expect(formats.x + formats.width).toBeLessThanOrEqual(vp.width);
      expect(formats.y).toBeGreaterThanOrEqual(0);
      expect(formats.y + formats.height).toBeLessThanOrEqual(boxes[1]?.y ?? 0);
      // Escape closes it and returns focus to its button.
      await page.getByRole("button", { name: "PNG", exact: true }).focus();
      await page.keyboard.press("Escape");
      await expect(page.locator("#export-formats")).toBeHidden();
      await expect(exp).toBeFocused();
      // Both live regions stay in the page.
      await expect(actions.locator('[role="status"]')).toHaveCount(2);
    });
  }
});

test.describe("the Studio preview is the image", () => {
  test("shows the sky only, with the title and moment as text above it", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    const canvas = page.getByRole("img", { name: /night sky poster/i });
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas box");
    expect(box.height / box.width).toBeCloseTo(1, 1);
    const heading = page.locator(".atlas-studio-preview .atlas-moment");
    await expect(heading).toContainText("E2E Night");
    await expect(heading).toContainText("Jan 1, 2026");
    await expect(heading).not.toContainText(/projection/i);
    const head = await heading.boundingBox();
    if (!head) throw new Error("no heading box");
    expect(head.y + head.height).toBeLessThanOrEqual(box.y);
    // It has the same panel and header as the Viewer.
    await expect(page.locator("footer .atlas-actions")).toBeVisible();
    await expect(page.locator(".atlas-site-name")).toHaveText("Starsky");
  });
});

test.describe("one header", () => {
  const surfaces: [string, () => string][] = [
    ["viewer", () => viewerUrl(fragmentFor())],
    ["studio", () => studioUrl(fragmentFor())],
  ];
  for (const [name, url] of surfaces) {
    test(`${name} carries the shared header`, async ({ page }) => {
      await page.goto(url());
      const link = page.getByRole("banner").getByRole("link", { name: "Starsky" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "#/");
      const style = await link.evaluate((el) => {
        const s = getComputedStyle(el);
        return { family: s.fontFamily, size: s.fontSize };
      });
      expect(style.family).toContain("Cormorant Garamond");
    });
  }

  test("the Explorer is full-bleed: no header, the canvas fills the viewport", async ({ page }) => {
    await openExplorer(page);
    await expect(page.getByRole("banner")).toHaveCount(0);
    const box = await page.getByRole("img", { name: /sky map/i }).boundingBox();
    const vp = page.viewportSize();
    if (!box || !vp) throw new Error("no box");
    expect(box.y).toBe(0);
    expect(box.height).toBe(vp.height);
    expect(box.width).toBe(vp.width);
  });

  test("the interface font is Inter, from the same origin", async ({ page }) => {
    const fonts: string[] = [];
    page.on("response", (response) => {
      if (/\.woff2(\?|$)/.test(response.url())) fonts.push(response.url());
    });
    await page.goto(viewerUrl(fragmentFor()));
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px "Inter Variable"'))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Inter Variable");
    const origin = new URL(page.url()).origin;
    expect(fonts.filter((url) => !url.startsWith(origin))).toEqual([]);
    // Latin subset only: no other Inter subset is requested.
    expect(fonts.filter((url) => /inter-(?!latin-wght)/.test(url))).toEqual([]);
  });
});

test.describe("the shared form layout (FR-009)", () => {
  const wide = (page: Page): boolean => (page.viewportSize()?.width ?? 0) >= 700;
  const top = async (locator: Locator): Promise<number> => {
    const box = await locator.boundingBox();
    if (!box) throw new Error("no box");
    return Math.round(box.y);
  };

  test("the landing has no explainer, and its primary button is centred at its natural width", async ({ page }) => {
    await page.goto("/");
    const submit = page.getByRole("button", { name: "Explore this sky" });
    await expect(submit).toBeVisible();
    await expect(page.getByText("What is this page?")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Load a random sky" })).toBeVisible();
    const form = await page.locator(".atlas-form-wrap .atlas-panel").boundingBox();
    const box = await submit.boundingBox();
    if (!form || !box) throw new Error("no boxes");
    expect(box.x + box.width / 2).toBeCloseTo(form.x + form.width / 2, 0);
    expect(box.width).toBeLessThan(form.width * 0.7);
  });

  test("date and time sit beside the timezone on wide screens and stack on small ones, labels visible", async ({ page }) => {
    await page.goto("/");
    const when = page.getByLabel("Date and time", { exact: true });
    const zone = page.getByLabel("Timezone", { exact: true });
    await expect(when).toBeVisible();
    await expect(zone).toBeVisible();
    await expect(page.getByRole("button", { name: "Detect" })).toBeVisible();
    if (wide(page)) expect(await top(when)).toBe(await top(zone));
    else expect(await top(zone)).toBeGreaterThan(await top(when));
  });

  test("Appearance pairs its controls, and Shape is a two-option segmented switch", async ({ page }) => {
    // The poster options left the landing (013); the Studio is where they live.
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    const projection = page.getByLabel("Projection", { exact: true });
    const shape = page.getByRole("radiogroup", { name: "Shape" });
    await expect(shape.getByRole("radio")).toHaveCount(2);
    await expect(shape.getByRole("radio", { name: "circle" })).toBeChecked();
    const fisheye = page.getByLabel("Fisheye strength");
    const separation = page.getByLabel("Minimum separation");
    const glowToggle = page.getByLabel("Glow", { exact: true });
    const glow = page.getByLabel("Glow intensity");
    if (wide(page)) {
      expect(Math.abs((await top(projection)) - (await top(shape)))).toBeLessThanOrEqual(30);
      expect(await top(fisheye)).toBe(await top(separation));
      expect(Math.abs((await top(glow)) - (await top(glowToggle)))).toBeLessThanOrEqual(48);
    } else {
      expect(await top(shape)).toBeGreaterThan(await top(projection));
      expect(await top(separation)).toBeGreaterThan(await top(fisheye));
    }
    // The title is full width, below the pairs.
    expect(await top(page.getByLabel("Title", { exact: true }))).toBeGreaterThan(await top(glow));
    // Choosing a segment works through the real radio and is announced as checked.
    await shape.getByRole("radio", { name: "square" }).check();
    await expect(shape.getByRole("radio", { name: "square" })).toBeChecked();
    await expect(shape.getByRole("radio", { name: "circle" })).not.toBeChecked();
  });

  test("the Studio's Advanced checkboxes and the glow row stay inline at 390 px", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 400, "the 390 px phone");
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await page.getByText("Advanced", { exact: true }).click();
    const lines = page.getByLabel("Constellation lines");
    const labels = page.getByLabel("Constellation labels");
    await expect(labels).toBeVisible();
    expect(await top(lines)).toBe(await top(labels));
    const glowToggle = page.getByLabel("Glow", { exact: true });
    const glow = page.getByLabel("Glow intensity");
    expect(Math.abs((await top(glow)) - (await top(glowToggle)))).toBeLessThanOrEqual(48);
  });

  test("the Studio uses the same layout, with Advanced collapsed", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    const advanced = page.locator("details", { has: page.getByText("Advanced", { exact: true }) });
    await expect(advanced).toHaveJSProperty("open", false);
    await expect(page.getByLabel("Limiting magnitude")).toBeHidden();
    await expect(page.getByRole("radiogroup", { name: "Shape" }).getByRole("radio")).toHaveCount(2);
    await advanced.getByText("Advanced", { exact: true }).click();
    await expect(page.getByLabel("Limiting magnitude")).toBeVisible();
  });
});

test.describe("phone widths", () => {
  for (const width of [360, 390]) {
    test.describe(`${width.toString()} px`, () => {
      test.use({ viewport: { width, height: 844 } });
      const surfaces: [string, () => string][] = [
        ["viewer", () => viewerUrl(fragmentFor())],
        ["studio", () => studioUrl(fragmentFor())],
        ["explorer", () => explorerUrl(SIRIUS)],
        ["landing", () => "/"],
      ];
      for (const [name, url] of surfaces) {
        test(`${name} does not scroll sideways`, async ({ page }) => {
          await page.goto(url());
          if (name === "explorer") await openExplorer(page);
          else if (name === "landing") await expect(page.getByRole("button", { name: "Explore this sky" })).toBeVisible();
          else await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
          if (name === "viewer") await openExport(page);
          if (name === "landing" || name === "studio") {
            // Open every disclosure so the widest content is measured.
            for (const summary of await page.locator("details > summary").all()) await summary.click();
          }
          const overflow = await page.evaluate(() => {
            const w = window.innerWidth;
            const out: string[] = [];
            if ((document.scrollingElement?.scrollWidth ?? 0) > w) out.push("page scrolls sideways");
            for (const el of Array.from(document.querySelectorAll("body *"))) {
              // Map tiles run past the map's edge and are clipped by it, as they should be.
              if (el.closest(".leaflet-container") && !el.classList.contains("leaflet-container")) continue;
              const r = el.getBoundingClientRect();
              if (r.width > 0 && (r.right > w + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed") {
                out.push(`${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`);
              }
            }
            return out.slice(0, 5);
          });
          expect(overflow).toEqual([]);
        });
      }
    });
  }
});

test.describe("axe on the shared identity", () => {
  for (const [name, url] of [
    ["viewer", () => viewerUrl(fragmentFor())],
    ["studio", () => studioUrl(fragmentFor())],
  ] as const) {
    test(`${name} has no serious or critical violations`, async ({ page }) => {
      await page.goto(url());
      await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
      if (name === "viewer") await openExport(page);
      const results = await analyze(page);
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
    });
  }

  test("the Explorer with its panel open has no serious or critical violations", async ({ page }) => {
    await openExplorer(page, "HIP:32349");
    if (await isSheet(page)) await page.getByRole("button", { name: "Show details" }).filter({ visible: true }).click();
    else if (!(await page.locator("#explorer-inspector-body").isVisible())) await tab(page).click();
    await expect(page.locator("#explorer-inspector-body")).toBeVisible();
    const results = await analyze(page);
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
  });
});
