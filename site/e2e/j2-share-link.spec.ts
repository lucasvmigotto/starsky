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

  test("no fragment shows the location-first landing", async ({ page }) => {
    await page.goto("/");
    // With no link the landing owns the page: it asks where to explore from.
    await expect(
      page.getByRole("heading", { name: "Where do you want to explore the sky from?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /explore this sky/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /load a random sky/i }),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: /search for a place/i })).toBeVisible();
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

test.describe("J2 shared link in a pt-BR browser", () => {
  // Artifact determinism (spec 017): the link, not the visitor's browser,
  // decides the poster's words. Before the pin, this context drew
  // "25 de dez. de 2024" in the moment line and in the exported caption.
  test.use({ locale: "pt-BR" });

  test("the moment line stays in the poster's en-US format", async ({ page }) => {
    await page.goto(
      viewerUrl(fragmentFor({ when_utc: "2024-12-25T10:00:00Z", tz: "Australia/Sydney" })),
    );
    const moment = "Dec 25, 2024, 9:00 PM Australia/Sydney";
    // The visible moment line under the title…
    await expect(page.getByText(moment, { exact: true })).toBeVisible();
    // …and the canvas's text alternative, built from the same detail line the
    // exported caption draws.
    await expect(page.getByText(`40.7580°N, 73.9855°W — Times Square · ${moment}`).first()).toBeAttached();
  });
});
