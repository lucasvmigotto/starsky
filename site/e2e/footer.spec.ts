/**
 * The footer, in a real browser (000-design-system T024).
 *
 * The unit test proves the wiring — that `__APP_VERSION__` is defined from
 * `package.json` and that the footer reads the constant. Only a browser proves
 * the substitution actually happens in the built bundle, which is exactly the
 * step a source-level assertion cannot see.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";
import pkg from "../package.json" with { type: "json" };

test.describe("footer", () => {
  test("prints the package version", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: `starsky@v${pkg.version}` })).toBeVisible();
    // The placeholder must be substituted, not rendered literally.
    await expect(footer).not.toContainText("{version}");
  });

  test("carries the attribution", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    const footer = page.locator("footer");
    // Legal text: Stellarium's CC BY-SA 4.0 and OSM's contributors.
    await expect(footer).toContainText(/Stellarium/);
    await expect(footer).toContainText(/OpenStreetMap/);
  });

  test("links the repository, not a 404 tag path", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    // One link: the version is the link to the source (FR-011).
    await expect(page.locator("footer").getByRole("link")).toHaveCount(1);
    const link = page.getByRole("link", { name: `starsky@v${pkg.version}` });
    await expect(link).toHaveAttribute(
      "href",
      "https://github.com/lucasvmigotto/starsky",
    );
  });

  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`keeps the credits on one line at ${width.toString()} px, tagline and version on the right`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(viewerUrl(fragmentFor()));
      const credits = page.locator("footer .atlas-footer-info .atlas-footer-meta");
      await expect(credits).toHaveText(
        "Stars: Hipparcos, JPL · Lines: Stellarium (CC BY-SA 4.0) · Places: © OpenStreetMap contributors",
      );
      const box = await credits.boundingBox();
      const lineHeight = await credits.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      expect(box?.height ?? 99).toBeLessThanOrEqual(lineHeight * 1.5);
      const version = await page.locator("footer .atlas-footer-version").boundingBox();
      expect((version?.x ?? 0) > (box?.x ?? 0) + (box?.width ?? 0)).toBe(true);
    });
  }

  test("puts the tagline right before the version link, on the right", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    const group = page.locator("footer .atlas-footer-version");
    await expect(group).toHaveText(`Drawn from 8 000+ stars, in your browser · starsky@v${pkg.version}`);
    await expect(group.getByRole("link")).toHaveCount(1);
  });

  test("has no download control — one export surface (D15)", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    // The old footer had a "Save image" button; the export row owns that now.
    await expect(page.locator("footer")).not.toContainText(/save image/i);
  });
});