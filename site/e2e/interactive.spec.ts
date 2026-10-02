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

  test("hovering draws the highlight where the cursor is", async ({
    page,
  }) => {
    /*
     * The orientation regression. The renderer once drew the mirror image of
     * its own model: the tooltip named the model-correct figure while the
     * highlight drew mirrored across the disc — hovering the bottom lit up
     * the top. Names alone cannot see this (the tooltip reads the model, so
     * it is correct in both worlds); only drawn pixels near the cursor can.
     *
     * The overlay redraws the hovered figure's segments thicker and brighter
     * on top of an otherwise darkening veil, so pixels near the cursor must
     * get brighter when the highlight lands on them. A mirrored highlight
     * lands far away and the veil can only darken.
     */
    await openViewer(page);
    const canvas = page.getByRole("img", { name: /night sky poster/i });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    // A non-nullable binding for the evaluate closures below; the guard
    // above does not narrow through them.
    const bb: { x: number; y: number; width: number; height: number } = box;
    const tip = page.locator(".atlas-tooltip");

    // CSS positions of drawn content (stars, lines, labels) inside a logical
    // y-band. Read before hovering: the first hover veils the disc and would
    // dim the scan. The ring is skipped by radius: at ~377px from the centre
    // it sits outside the hit-test gate, so its pixels can never pick.
    async function contentPoints(
      y0: number,
      y1: number,
    ): Promise<Array<{ x: number; y: number }>> {
      return page.evaluate(
        ({ box: bb, y0, y1 }) => {
          const c = document.querySelector("canvas");
          if (!(c instanceof HTMLCanvasElement)) return [];
          const ctx = c.getContext("2d");
          if (!ctx) return [];
          const sx = c.width / 800;
          const sy = c.height / 1000;
          const data = ctx.getImageData(
            0,
            Math.round(y0 * sy),
            c.width,
            Math.round((y1 - y0) * sy),
          ).data;
          const w = c.width;
          const points: Array<{ x: number; y: number }> = [];
          // Bounded, and spatially spread: row-major order would fill the cap
          // from a single bright blob (one unpickable field star starves the
          // whole sweep), so gather across the band, then stride-sample.
          const found: Array<{ x: number; y: number }> = [];
          for (let row = 0; row < (y1 - y0) * sy; row += 4) {
            for (let col = 0; col < w; col += 4) {
              const lx = col / sx;
              const ly = y0 + row / sy;
              if (Math.hypot(lx - 400, ly - 400) > 365) continue;
              const i = (row * w + col) * 4;
              const luma =
                0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
              if (luma > 90) {
                found.push({
                  x: bb.x + (lx / 800) * bb.width,
                  y: bb.y + (ly / 1000) * bb.height,
                });
                if (found.length >= 400) break;
              }
            }
            if (found.length >= 400) break;
          }
          // Twelve candidates maximum: the test must fit the 30s timeout on
          // slow mobile emulation, and the loop below stops at the first
          // measurement.
          const stride = Math.max(1, Math.floor(found.length / 12));
          found.forEach((p, k) => {
            if (k % stride === 0 && points.length < 12) points.push(p);
          });
          return points;
        },
        { box: bb, y0, y1 },
      );
    }

    // Pixels near the cursor that the highlight made brighter. Read the bare
    // poster, hover, read again, diff in-page so no image ever crosses the
    // wire.
    async function brightenedNear(
      point: { x: number; y: number },
    ): Promise<number | null> {
      await page.mouse.move(2, 2);
      await expect(tip).toBeHidden({ timeout: 2_000 });
      const bare = await page.evaluate(
        ({ box: bb, point }) => {
          const c = document.querySelector("canvas");
          if (!(c instanceof HTMLCanvasElement)) return [];
          const ctx = c.getContext("2d");
          if (!ctx) return [];
          const sx = c.width / bb.width;
          const sy = c.height / bb.height;
          const cx = Math.round((point.x - bb.x) * sx);
          const cy = Math.round((point.y - bb.y) * sy);
          const half = Math.round(40 * sx);
          const data = ctx.getImageData(
            Math.max(0, cx - half),
            Math.max(0, cy - half),
            half * 2,
            half * 2,
          ).data;
          const out: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            out.push(
              0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2],
            );
          }
          return out;
        },
        { box: bb, point },
      );
      await page.mouse.move(point.x, point.y);
      try {
        // Generous on purpose: each hover re-renders the page and redraws
        // the canvas, which on emulated mobile CPUs lands well past a
        // snappy 150ms. Hits resolve as soon as the tooltip mounts; only
        // misses pay the full wait, and candidates are capped.
        await expect(tip).toBeVisible({ timeout: 600 });
      } catch {
        // Bright pixels need not be lines (a label, a lone star outside
        // tolerance); this candidate cannot carry the assertion.
        return null;
      }
      return page.evaluate(
        ({ box: bb, point, bare }) => {
          const c = document.querySelector("canvas");
          if (!(c instanceof HTMLCanvasElement)) return 0;
          const ctx = c.getContext("2d");
          if (!ctx) return 0;
          const sx = c.width / bb.width;
          const sy = c.height / bb.height;
          const cx = Math.round((point.x - bb.x) * sx);
          const cy = Math.round((point.y - bb.y) * sy);
          const half = Math.round(40 * sx);
          const data = ctx.getImageData(
            Math.max(0, cx - half),
            Math.max(0, cy - half),
            half * 2,
            half * 2,
          ).data;
          let brighter = 0;
          for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
            const luma =
              0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            if (luma - (bare[j] ?? 0) > 40) brighter += 1;
          }
          return brighter;
        },
        { box: bb, point, bare },
      );
    }

    // A half-plane is convex: a straight segment between two southern points
    // cannot reach the top band, so content hovered there belongs to a
    // northern figure in any world — the question is only where its
    // highlight draws.
    const points = await contentPoints(60, 320);
    expect(
      points.length,
      "no drawn content in the northern band to hover",
    ).toBeGreaterThan(0);
    let measured: number | null = null;
    for (const point of points) {
      measured = await brightenedNear(point);
      if (measured !== null) break;
    }
    expect(
      measured,
      "hovered drawn content but nothing was picked — no highlight to measure",
    ).not.toBeNull();
    // A redrawn double-width segment crossing the 80px clip is hundreds of
    // pixels; a mirrored highlight leaves zero (the veil only darkens).
    expect(measured ?? 0).toBeGreaterThan(40);
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
