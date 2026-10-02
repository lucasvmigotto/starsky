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

    // Scope to the export row's own status region: the Viewer has a second one for
    // its sky announcements (T035), so a bare `getByRole("status")` is
    // ambiguous now that both exist.
    await expect(
      page.locator(".atlas-export-status"),
    ).toContainText(/PNG/i);
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

/**
 * 007 FT009 — the failure half of "a failed export shows the error copy".
 *
 * Separate `describe` because it has to break the page *before* it loads:
 * `URL.createObjectURL` is the only call in the client that turns a Blob into a
 * download (`lib/render/export.ts:274`), so making it throw fails an export at
 * the last possible moment — after the poster has been rendered — which is the
 * interesting case. Nothing else in the app touches that API, so the stub cannot
 * affect page load.
 */
test.describe("J1 export failure", () => {
  test("names the format, promises the map is intact, and stays recoverable", async ({
    page,
  }) => {
    const downloads: string[] = [];
    page.on("download", (file) => {
      downloads.push(file.suggestedFilename());
    });
    await page.addInitScript(() => {
      URL.createObjectURL = () => {
        throw new Error("blob blocked by test");
      };
    });

    await page.goto(viewerUrl(fragmentFor()));
    const poster = page.getByRole("img", { name: /night sky poster/i });
    await expect(poster).toBeVisible();
    await openExport(page);

    const pdf = page.getByRole("button", { name: "PDF", exact: true });
    await expect(pdf).toBeEnabled();
    await pdf.click();

    // Scoped to the export row: the Viewer has a second status region for sky
    // announcements, so a bare getByRole("status") is ambiguous.
    const status = page.locator(".atlas-export-status");
    // The format is named, so the user knows which of the three failed…
    await expect(status).toContainText("PDF");
    await expect(status).toContainText(/failed/i);
    // …and the message carries the reassurance the catalogue promises: the
    // failure is in the download, never in the rendered map.
    await expect(status).toContainText(/map is unaffected/i);
    // The poster is still on screen. The claim in the copy is checked, not
    // just printed.
    await expect(poster).toBeVisible();

    // Nothing was published to the user's disk.
    expect(downloads).toEqual([]);

    // And the control is not stuck: a failed export must leave the row usable,
    // or the poster is unrecoverable without a page reload.
    await expect(pdf).toBeEnabled();
    await expect(pdf).toHaveAttribute("aria-busy", "false");
  });
});
