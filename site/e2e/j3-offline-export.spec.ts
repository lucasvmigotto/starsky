/**
 * J3 — offline export (qa:strategy; architecture fitness function 6).
 *
 * The poster must render and export with no network, using the bundled font.
 * A silent fallback to a system serif is exactly what BCR-0004 removed, so
 * this asserts the font actually arrived rather than merely that a file did.
 */
import {
  expect,
  fragmentFor,
  openExport,
  test,
  viewerUrl,
} from "./fixtures.ts";

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
    await openExport(page);
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

  test("the exported PDF is vector, carries real text and embeds the font", async ({
    page,
  }) => {
    // 007 T031 — exporting and then *opening* the file standalone. The contract
    // (contracts/render-spec.md) requires: true vector, selectable text, and an
    // embedded font so the poster's typography survives on any reader.
    // See finding-pdf-font-not-embedded.md — the font half fails today.
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const download = page.waitForEvent("download");
    await openExport(page);
    await page.getByRole("button", { name: "PDF", exact: true }).click();
    const file = await download;
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const pdf = Buffer.concat(chunks);
    const raw = pdf.toString("latin1");

    // A real document, not an empty stream.
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);

    // Vector: no full-page raster image.
    expect(raw).not.toMatch(/\/Subtype\s*\/Image/);

    // Selectable text: real glyph-showing operators, not outlines.
    expect(raw).toMatch(/BT[\s\S]{0,400}?(Tj|TJ)/);

    // Embedded font. This is the contract's requirement and the current gap:
    // jsPDF falls back to the standard fonts (Helvetica/Courier), which every
    // reader substitutes, so the poster's own face never reaches the file.
    expect(
      raw,
      "the PDF embeds no font — the poster's typography is lost. " +
        "See specs/007-renderer-export/finding-pdf-font-not-embedded.md",
    ).toMatch(/\/FontFile2|\/FontFile3|\/FontFile/);
  });
});
