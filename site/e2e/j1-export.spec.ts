/**
 * J1 — land, render, export (qa:strategy's highest-value journey).
 *
 * The unit suites prove the exporters build correct bytes; this proves the
 * buttons actually produce a **download** in a real browser — the check no
 * other layer can make, and the one that has never been run.
 */
import { expect, fragmentFor, openExport, test, viewerUrl } from "./fixtures.ts";

test.describe("J1 poster export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    // The poster is ready when the canvas is present and non-trivial.
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await openExport(page);
    await expect(
      page.getByRole("button", { name: "PNG", exact: true }),
    ).toBeEnabled();
  });

  test("collapses the formats behind one trigger", async ({ page }) => {
    // Export is the last step, so it must not compete with the poster
    // (vision principles 2 and 3).
    const trigger = page.getByRole("button", { name: "Close export" });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    for (const label of ["PNG", "SVG", "PDF"]) {
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toBeVisible();
    }
    // The group is named by the trigger that discloses it.
    await expect(page.getByRole("group", { name: /export/i })).toBeVisible();
  });

  test("hides the formats again when the trigger is closed", async ({ page }) => {
    await page.getByRole("button", { name: "Close export" }).click();
    await expect(
      page.getByRole("button", { name: "PNG", exact: true }),
    ).toBeHidden();
  });

  test("renders the poster and offers all three formats", async ({ page }) => {
    for (const label of ["PNG", "SVG", "PDF"]) {
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("downloads a PNG", async ({ page }) => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.png$/);

    // A real poster is not a few bytes; guard against an empty download.
    const stream = await file.createReadStream();
    let bytes = 0;
    for await (const chunk of stream) {
      bytes += (chunk as Buffer).length;
    }
    expect(bytes).toBeGreaterThan(10_000);

    await expect(page.getByRole("status")).toContainText(/PNG/i);
  });

  test("downloads an SVG containing the title as text", async ({ page }) => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.svg$/);

    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const svg = Buffer.concat(chunks).toString("utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("E2E Night");
    expect(svg).toContain("<text");
    // Self-contained: no external asset references.
    expect(svg).not.toContain("<image");
  });

  test("downloads a PDF", async ({ page }) => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.pdf$/);

    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const pdf = Buffer.concat(chunks);
    // PDF magic number, and non-trivial size.
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
  });
});
