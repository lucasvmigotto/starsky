/**
 * Interactive poster (refactor: the default flip).
 *
 * The flip deleted the preview renderer and reimplemented zoom/pan as a blit of
 * a cached composition. The page shows the sky image only (BCR-0013), so there
 * is no hover or selection. These are the behaviours at risk, so they get
 * their own journey rather than relying on the export tests to notice.
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
  test("resting the pointer on the image changes nothing: no hover, no tooltip", async ({
    page,
  }) => {
    // BCR-0013: figures are the Explorer's job, so the image has no hover
    // highlight any more. Equal pixels before and after is the whole claim.
    await openViewer(page);
    const box = await posterBox(page);
    await page.mouse.move(2, 2);
    const before = await shot(page, box);
    for (const fraction of [0.3, 0.5, 0.7]) {
      await page.mouse.move(
        box.x + box.width * fraction,
        box.y + box.height * fraction * 0.5,
      );
    }
    await expect(page.locator(".atlas-tooltip, .atlas-figure")).toHaveCount(0);
    expect(await shot(page, box)).toEqual(before);
  });

  test("the exported SVG still carries its labels and caption although the page shows only the sky", async ({
    page,
  }) => {
    await openViewer(page);
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
    // Constellation labels plus the caption lines.
    expect(labels.length).toBeGreaterThan(3);
    expect(svg).toContain("40.7580");
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
  /** The view controls' reset. */
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
    // Focusing scrolls the poster into view (it is taller than the viewport
    // once the controls above it are counted), so measure from there.
    const focused = await page.evaluate(() => window.scrollY);
    // Arrows have nothing to pan at the home view, and must not scroll the
    // page either — the map claims those keys, so it has to use them.
    await page.keyboard.press("ArrowRight");
    await expect(reset).toBeDisabled();
    expect(await page.evaluate(() => window.scrollY)).toBe(focused);

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
