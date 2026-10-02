/**
 * Interactive poster (refactor: the default flip).
 *
 * The flip deleted the preview renderer and reimplemented zoom/pan as a blit of
 * a cached composition, with hover as a scrim + focus overlay. These are the
 * behaviours at risk, so they get their own journey rather than relying on the
 * export tests to notice.
 */
import { expect, fragmentFor, openExport, test, viewerUrl } from "./fixtures.ts";

async function openViewer(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(viewerUrl(fragmentFor()));
  await expect(
    page.getByRole("img", { name: /night sky poster/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export" }),
  ).toBeVisible();
}

/** The poster's box, or a hard failure — every test here needs it. */
async function posterBox(
  page: import("@playwright/test").Page,
): Promise<NonNullable<Awaited<ReturnType<typeof canvasBox>>>>
{
  return (await canvasBox(page)) ?? Promise.reject(new Error("poster has no box"));
}

async function canvasBox(page: import("@playwright/test").Page) {
  return page.getByRole("img", { name: /night sky poster/i }).boundingBox();
}

/**
 * Mean luminance of a square patch of the poster, addressed as a fraction of
 * its width and height so a caller names a region rather than a pixel.
 *
 * Read from the canvas rather than from a screenshot so that nothing drawn
 * *around* the poster — a tooltip, a caret, a scrollbar — can move the number.
 * There is no cross-origin taint to worry about: the poster is drawn with
 * canvas operations, not loaded as an image.
 */
async function meanLuma(
  page: import("@playwright/test").Page,
  at: { x: number; y: number },
  size = 48,
): Promise<number> {
  return page.evaluate(
    ({ at, size }) => {
      const canvas = document.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) return Number.NaN;
      const ctx = canvas.getContext("2d");
      if (!ctx) return Number.NaN;
      const side = Math.min(size, canvas.width, canvas.height);
      const x = Math.max(
        0,
        Math.min(canvas.width - side, Math.round(canvas.width * at.x) - side / 2),
      );
      const y = Math.max(
        0,
        Math.min(canvas.height - side, Math.round(canvas.height * at.y) - side / 2),
      );
      const data = ctx.getImageData(x, y, side, side).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum +=
          0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      return sum / (data.length / 4);
    },
    { at, size },
  );
}

/**
 * Everything drawn inside a box, as bytes, for "did this region change".
 *
 * `animations: "disabled"` finishes the explorer's reveal animation — which
 * translates the poster 10px on its way in — so two shots are comparable at any
 * moment. Waiting for the animation instead does not work: its fill is
 * `forwards`, and a settled transform reports as `matrix(1, 0, 0, 1, 0, 0)`,
 * not the `none` that was written, so a `toHaveCSS("transform", "none")` wait
 * times out on a poster that has already arrived.
 */
async function shot(
  page: import("@playwright/test").Page,
  clip: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): Promise<Buffer> {
  return page.screenshot({ clip, animations: "disabled" });
}

test.describe("interactive poster", () => {
  test("selecting a figure marks it pressed", async ({ page }) => {
    await openViewer(page);
    const figure = page.locator(".atlas-figure").first();
    const name = (await figure.innerText()).split("\n")[0] ?? "";

    await figure.click();
    await expect(figure).toHaveAttribute("aria-pressed", "true");

    // The panel offers a reset once something is focused — proof the state took.
    await expect(page.getByRole("button", { name: /reset view/i })).toBeVisible();
    // The figure name is still the one we clicked.
    expect(await figure.innerText()).toContain(name);
  });

  test("selecting a figure zooms the view, and reset returns it", async ({
    page,
  }) => {
    await openViewer(page);
    const canvas = page.getByRole("img", { name: /night sky poster/i });
    // Scale is not exposed to the DOM, so assert the observable proxy: the
    // component re-renders the canvas on view change without error, and the
    // reset control appears then disappears.
    const figure = page.locator(".atlas-figure").first();
    await figure.click();
    const reset = page.getByRole("button", { name: /reset view/i });
    await expect(reset).toBeVisible();

    await reset.click();
    await expect(reset).toBeHidden();
    await expect(canvas).toBeVisible();
  });

  test("hovering a figure does not break the canvas", async ({ page }) => {
    await openViewer(page);
    const canvas = page.getByRole("img", { name: /night sky poster/i });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Sweep the pointer across the disc; each move may trigger the focus
    // overlay. A throw here would surface as a console error.
    for (const fraction of [0.3, 0.5, 0.7]) {
      await page.mouse.move(
        box.x + box.width * fraction,
        box.y + box.height * fraction * 0.5,
      );
    }
    await expect(canvas).toBeVisible();
  });

  test("the poster matches the exported SVG's structure", async ({ page }) => {
    // The point of the flip: what is on screen and what is exported come from
    // one composition. Assert the viewer's canvas and the exported SVG agree on
    // the figure count the panel reports.
    await openViewer(page);
    const figureCount = await page.locator(".atlas-figure").count();
    expect(figureCount).toBeGreaterThan(0);

    const download = page.waitForEvent("download");
    await openExport(page);
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const file = await download;
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const svg = Buffer.concat(chunks).toString("utf-8");
    const labels = svg.match(/<text /g) ?? [];
    // Every figure is labelled, plus the caption line(s).
    expect(labels.length).toBeGreaterThanOrEqual(figureCount);
  });
});

/**
 * Moving the map.
 *
 * The poster was a blit with a transform and no way to change the transform:
 * hovering lit a constellation up, and that was the whole of it. Everything
 * here is about a visitor being able to go somewhere, and about the ways that
 * silently stop working — a passive wheel listener, a drag that ends in a
 * click, an overlay drawn outside the transform.
 */
test.describe("navigating the poster", () => {
  const zoomIn = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /zoom in/i });
  const zoomOut = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /zoom out/i });
  /** The view controls' own reset, distinct from the panel's `figures.reset`. */
  const fit = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /show the whole sky/i });

  /** Park the pointer off the poster so no live tooltip tints a screenshot. */
  async function park(page: import("@playwright/test").Page): Promise<void> {
    await page.mouse.move(2, 2);
  }

  test("dragging pans, and there is nothing to pan to at the home view", async ({
    page,
  }) => {
    await openViewer(page);
    const box = await posterBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Scale 1 fills the frame exactly, so the whole poster is already on
    // screen: the fit control reads as unavailable and a drag must not shift
    // anything. Asserting equality rather than "not equal" is the point —
    // it is the only way to tell a deliberate no-op from a pan too small to
    // notice.
    await expect(fit(page)).toBeDisabled();
    await park(page);
    const home = await shot(page, box);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 90, cy + 60, { steps: 10 });
    await page.mouse.up();
    await park(page);

    expect(await shot(page, box)).toEqual(home);
    await expect(fit(page)).toBeDisabled();
  });

  test("dragging pans once there is somewhere to pan to", async ({ page }) => {
    await openViewer(page);
    const box = await posterBox(page);
    await zoomIn(page).click();
    await zoomIn(page).click();
    await park(page);
    const before = await shot(page, box);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy, { steps: 10 });
    await page.mouse.up();
    await park(page);

    expect(await shot(page, box)).not.toEqual(before);
    // The view no longer sits at home, so the fit control must be live.
    await expect(fit(page)).toBeEnabled();
  });

  test("the wheel zooms and keeps the page still", async ({ page }) => {
    await openViewer(page);
    const box = await posterBox(page);
    await park(page);
    const before = await shot(page, box);

    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.3);
    await page.mouse.wheel(0, -300);
    await expect(fit(page)).toBeEnabled();
    await park(page);

    expect(await shot(page, box)).not.toEqual(before);
    /*
     * React registers its own wheel handler passively, where `preventDefault`
     * is ignored — so an `onWheel` implementation looks correct and scrolls the
     * page away anyway. This is the assertion that would catch that.
     */
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("the poster answers to the keyboard", async ({ page }) => {
    await openViewer(page);
    const canvas = page.getByRole("img", { name: /night sky poster/i });
    const reset = fit(page);
    await expect(reset).toBeDisabled();

    await canvas.focus();
    // Arrows have nothing to pan at the home view, and must not scroll the
    // page either — the map claims those keys, so it has to use them.
    await page.keyboard.press("ArrowRight");
    await expect(reset).toBeDisabled();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.keyboard.press("+");
    await expect(reset).toBeEnabled();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("0");
    await expect(reset).toBeDisabled();
  });

  test("the view controls move the view and undo it", async ({ page }) => {
    await openViewer(page);
    // Scale 1 is the floor, so there is nothing to zoom out *from* yet.
    await expect(zoomOut(page)).toBeDisabled();
    await expect(fit(page)).toBeDisabled();

    await zoomIn(page).click();
    await expect(fit(page)).toBeEnabled();
    await expect(zoomOut(page)).toBeEnabled();

    await zoomIn(page).click();
    await fit(page).click();
    await expect(fit(page)).toBeDisabled();
    await expect(zoomOut(page)).toBeDisabled();
  });

  test("dragging across a figure does not open it", async ({ page }) => {
    await openViewer(page);
    const box = await posterBox(page);
    // Zoom first. At the home view the drag is a no-op, so the click that ends
    // it would land where it started — a different situation from the one
    // under test.
    await zoomIn(page).click();
    await zoomIn(page).click();

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy, { steps: 10 });
    await page.mouse.up();

    // Every drag ends in a click. If that click reached the hit-test, panning
    // the map would keep selecting constellations the visitor only moved past.
    await expect(page.locator('.atlas-figure[aria-pressed="true"]')).toHaveCount(
      0,
    );
    // The panel offers a reset only once something is focused; it must not have
    // appeared. (The view controls' own control is named differently on
    // purpose — see `viewer.resetView`.)
    await expect(
      page.getByRole("button", { name: /reset view/i }),
    ).toBeHidden();
  });

  test("two fingers move and scale the poster together", async ({ page }) => {
    await openViewer(page);
    const box = await posterBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await park(page);
    const before = await shot(page, box);

    // Synthesised rather than driven through a real touch screen: Playwright's
    // touch API taps but does not drag two fingers, and this is the only way
    // to reach the pinch branch.
    await page.evaluate(
      ({ cx, cy }) => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;
        const fire = (type: string, id: number, x: number, y: number) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              pointerId: id,
              pointerType: "touch",
              isPrimary: id === 1,
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
            }),
          );
        fire("pointerdown", 1, cx - 40, cy);
        fire("pointerdown", 2, cx + 40, cy);
        fire("pointermove", 1, cx - 90, cy);
        fire("pointermove", 2, cx + 90, cy);
        fire("pointerup", 1, cx - 90, cy);
        fire("pointerup", 2, cx + 90, cy);
      },
      { cx, cy },
    );

    await park(page);
    // A pinch outward is a zoom in, so the view has left home.
    await expect(fit(page)).toBeEnabled();
    expect(await shot(page, box)).not.toEqual(before);
  });

  test("the focus veil dims what is on screen, not the poster's own box", async ({
    page,
  }) => {
    await openViewer(page);
    /*
     * The regression. The veil was drawn *outside* the zoom transform while the
     * blit was drawn inside it, so a zoomed view dimmed only the middle of the
     * frame and drew the focused figure's name twice, slightly offset.
     */
    await zoomIn(page).click();
    await zoomIn(page).click(); // 1.5^2 = 2.25, pivoted on the disc centre

    // At this scale the corners of the frame show sky far outside the disc's
    // own extent — exactly the region an untransformed veil would miss.
    const corners = [
      { x: 0.06, y: 0.86 },
      { x: 0.94, y: 0.14 },
    ];

    // Resting on a figure *in the panel* sets the highlight without moving the
    // view, so the geometry these corners sample stays exactly as computed.
    const figure = page.locator(".atlas-figure").first();
    const lit: number[] = [];
    const clear: number[] = [];
    for (const corner of corners) {
      await park(page);
      clear.push(await meanLuma(page, corner));
      await figure.hover();
      lit.push(await meanLuma(page, corner));
    }

    for (const [i, corner] of corners.entries()) {
      expect(
        lit[i] ?? 0,
        `corner ${JSON.stringify(corner)} should dim when a figure is focused`,
      ).toBeLessThan((clear[i] ?? 0) * 0.8);
    }
  });

  test("@mobile the poster claims touch gestures instead of the page", async ({
    page,
  }) => {
    await openViewer(page);
    /*
     * On a phone the poster fills most of the viewport, so if the browser
     * claims one-finger vertical drags to scroll, panning the map is
     * impossible exactly where it is most wanted.
     */
    await expect(page.getByRole("img", { name: /night sky poster/i })).toHaveCSS(
      "touch-action",
      "none",
    );
  });
});
