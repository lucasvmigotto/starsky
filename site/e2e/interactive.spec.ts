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
 * The image does not move (FR-010). Zooming and exploring live in the Explorer.
 */
test.describe("the static image", () => {
  test("has no zoom or reset buttons and cannot take focus", async ({ page }) => {
    await openViewer(page);
    await expect(page.getByRole("button", { name: /zoom in|zoom out|whole sky/i })).toHaveCount(0);
    await expect(page.locator(".atlas-viewcontrols")).toHaveCount(0);
    await expect(page.getByRole("img", { name: /night sky poster/i })).not.toHaveAttribute("tabindex", /.*/);
  });

  test("does not respond to a drag, the wheel, a pinch or the keyboard", async ({ page }) => {
    await openViewer(page);
    const box = await posterBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(2, 2);
    const before = await shot(page, box);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 90, cy + 60, { steps: 10 });
    await page.mouse.up();
    await page.mouse.wheel(0, -300);
    await page.keyboard.press("+");
    await page.keyboard.press("ArrowRight");
    await page.evaluate(
      ({ cx, cy }) => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;
        const fire = (type: string, id: number, x: number, y: number) =>
          canvas.dispatchEvent(
            new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true }),
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
    // Scrolling the page is the wheel's only effect; scroll back so the box is comparable.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.mouse.move(2, 2);
    expect(await shot(page, box)).toEqual(before);
  });

  test("lets the page scroll over it, with no touch gestures claimed", async ({ page }) => {
    await openViewer(page);
    const touchAction = await page.getByRole("img", { name: /night sky poster/i }).evaluate((el) => getComputedStyle(el).touchAction);
    expect(touchAction).toBe("auto");
  });
});
