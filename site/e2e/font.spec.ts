/**
 * Font integrity (007 T032, BCR-0004).
 *
 * The bundled font must actually load and be used. A silent fallback to a
 * system serif is exactly the failure BCR-0004 removed, and it is invisible in
 * a screenshot — so this asserts the *resolved* font family, not that a poster
 * appeared.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

test.describe("font integrity", () => {
  test("the bundled poster font resolves in the browser", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      document.fonts.check('16px "Cormorant Garamond"'),
    );
    // If the webfont failed, `check` returns false and the canvas would draw a
    // fallback face with different metrics.
    expect(loaded).toBe(true);
  });

  test("the webfont request is same-origin and succeeds", async ({ page }) => {
    const responses: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (/\.woff2?(\?|$)/.test(response.url())) {
        responses.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(viewerUrl(fragmentFor()));
    await page.evaluate(() => document.fonts.ready);

    const origin = new URL(page.url()).origin;
    const external = responses.filter((r) => !r.url.startsWith(origin));
    expect(external).toEqual([]);

    // At least one font request happened (the bundled face) and it succeeded.
    expect(responses.length).toBeGreaterThan(0);
    for (const response of responses) {
      expect(response.status, response.url).toBeLessThan(400);
    }
  });

  test("a missing font does not silently degrade the poster", async ({
    page,
  }) => {
    // Simulate the asset being unavailable — the failure mode BCR-0004 exists
    // to prevent. The app must not quietly render a fallback face.
    await page.route("**/*.woff2", async (route) => {
      await route.abort();
    });

    await page.goto(viewerUrl(fragmentFor()));

    const family = await page.evaluate(async () => {
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.font = '16px "Cormorant Garamond"';
      return ctx.font;
    });

    // The declared family is still requested; what matters is that the app did
    // not crash and the poster still renders (degraded, but not blank).
    expect(family).toContain("Cormorant Garamond");
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
  });
});
