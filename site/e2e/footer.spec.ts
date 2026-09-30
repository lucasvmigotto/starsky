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
    await expect(footer).toContainText(`starsky v${pkg.version}`);
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
    const link = page.getByRole("link", { name: "source" });
    await expect(link).toHaveAttribute(
      "href",
      "https://github.com/lucasvmigotto/starsky",
    );
  });

  test("has no download control — one export surface (D15)", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    // The old footer had a "Save image" button; the export row owns that now.
    await expect(page.locator("footer")).not.toContainText(/save image/i);
  });
});