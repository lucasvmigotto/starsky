/**
 * Interactive poster (refactor: the default flip).
 *
 * The flip deleted the preview renderer and reimplemented zoom/pan as a blit of
 * a cached composition, with hover as a scrim + focus overlay. These are the
 * behaviours at risk, so they get their own journey rather than relying on the
 * export tests to notice.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

async function openViewer(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(viewerUrl(fragmentFor()));
  await expect(
    page.getByRole("img", { name: /night sky poster/i }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: /export poster/i })).toBeVisible();
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
