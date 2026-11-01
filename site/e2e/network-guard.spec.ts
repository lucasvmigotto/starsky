/**
 * The network guard (ADR-0008, 013 FR-005).
 *
 * No automated test may reach tile.openstreetmap.org or nominatim.openstreetmap.org.
 * `fixtures.ts` stubs both for every test and fails the test that causes a
 * response from either host that is not one of its stubs. This file proves the
 * guard is in force, so a regression in the fixture cannot silently let a real
 * request through. Only `j8-live-place-lookup.spec.ts` (opt-in, plain
 * Playwright) is outside it.
 */
import { NOMINATIM_HOST, TILE_HOST, expect, test } from "./fixtures.ts";

test.describe("network guard", () => {
  test("a tile request from the page is answered by the local stub, and counted", async ({ page, network }) => {
    await page.goto("/");
    const answer = await page.evaluate(async (host) => {
      const response = await fetch(`https://${host}/3/4/2.png`);
      return { status: response.status, type: response.headers.get("content-type"), stub: response.headers.get("x-starsky-stub") };
    }, TILE_HOST);
    expect(answer).toEqual({ status: 200, type: "image/png", stub: "1" });
    // The landing draws its own map too; the page-made request is among the counted ones.
    expect(network.tileRequests).toContain(`https://${TILE_HOST}/3/4/2.png`);
  });

  test("a geocoder request from the page is answered by the local stub, and counted", async ({ page, network }) => {
    await page.goto("/");
    const answer = await page.evaluate(async (host) => {
      const response = await fetch(`https://${host}/search?q=paris&format=jsonv2`);
      return { status: response.status, stub: response.headers.get("x-starsky-stub"), body: await response.text() };
    }, NOMINATIM_HOST);
    expect(answer).toEqual({ status: 200, stub: "1", body: "[]" });
    expect(network.searchRequests).toHaveLength(1);
  });

  test("the landing asks for its visible map tiles and never the geocoder", async ({ page, network }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeVisible();
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeAttached();
    await page.waitForLoadState("networkidle");
    expect(network.tileRequests.length).toBeGreaterThan(0);
    expect(network.searchRequests).toEqual([]);
  });

  test("the share, Explorer and Studio links request no tile either", async ({ page, network }) => {
    await page.goto("/#e=not-a-payload");
    await page.waitForLoadState("networkidle");
    await page.goto("/#studio=not-a-draft");
    await page.waitForLoadState("networkidle");
    expect(network.tileRequests).toEqual([]);
    expect(network.searchRequests).toEqual([]);
  });
});
