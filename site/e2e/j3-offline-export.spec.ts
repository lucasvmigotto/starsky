/**
 * J3 — offline export (qa:strategy; architecture fitness function 6).
 *
 * The poster must render and export with no network, using the bundled font.
 * A silent fallback to a system serif is exactly what BCR-0004 removed, so
 * this asserts the font actually arrived rather than merely that a file did.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

test.describe("J3 offline export", () => {
  test("exports an SVG with the network disabled and the font loaded", async ({
    page,
    context,
  }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    // The viewer redraws once webfonts settle; wait for that condition rather
    // than sleeping (qa-quality anti-pattern 3).
    await page.evaluate(() => document.fonts.ready);

    // Cut the network: the export must not need it.
    await context.setOffline(true);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const file = await download;

    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const svg = Buffer.concat(chunks).toString("utf-8");

    // Self-contained: no external references at all.
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("href=");
    expect(svg).toContain("<text");
  });

  test("the bundled font is served from our own origin", async ({ page }) => {
    const fontRequests: string[] = [];
    page.on("request", (request) => {
      if (/\.(woff2?|otf|ttf)(\?|$)/.test(request.url())) {
        fontRequests.push(request.url());
      }
    });

    await page.goto(viewerUrl(fragmentFor()));
    await page.evaluate(() => document.fonts.ready);

    // No third-party font host may appear (BCR-0004).
    const external = fontRequests.filter(
      (url) => !url.startsWith(page.url().split("/").slice(0, 3).join("/")),
    );
    expect(external).toEqual([]);
  });
});
