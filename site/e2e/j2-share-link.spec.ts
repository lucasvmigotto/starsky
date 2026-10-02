/**
 * J2 — shared-link round-trip (qa:strategy).
 *
 * The four viewer states and the codec's rejections, exercised through the real
 * router rather than the unit suite alone.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

test.describe("J2 shared link", () => {
  test("a valid fragment renders the viewer", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    // The header echoes the title from the payload.
    await expect(page.getByText("E2E Night")).toBeVisible();
  });

  test("no fragment shows the landing form", async ({ page }) => {
    await page.goto("/");
    // With no `#s=` the landing form owns the page. (The `EmptyState` exists
    // too, but inside a closed `<details>` explainer — hidden, deliberately.)
    await expect(
      page.getByRole("button", { name: /show my sky/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /load a random sky/i }),
    ).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /input mode/i })).toBeVisible();
  });

  test("a corrupt fragment shows the invalid state, not a crash", async ({
    page,
    consoleErrors,
  }) => {
    // Valid base64url alphabet, not valid zlib.
    await page.goto(viewerUrl("notarealpayload"));
    await expect(
      page.locator("p", { hasText: /this link holds no sky/i }),
    ).toBeVisible();
    // A handled rejection must not surface as an uncaught page error.
    expect(consoleErrors.filter((e) => /unhandled/i.test(e))).toEqual([]);
  });

  test("an unsupported version shows the legacy state", async ({ page }) => {
    // Same codec, version bumped to something the viewer does not know.
    const future = fragmentFor({ v: 99 });
    await page.goto(viewerUrl(future));
    await expect(
      page.locator("p", { hasText: /an older kind of link/i }),
    ).toBeVisible();
  });
});
