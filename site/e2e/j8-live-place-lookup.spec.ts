/**
 * J8 — live place lookup (opt-in).
 *
 * The browser is the only client of Nominatim since BCR-0001/0005, and every
 * other journey **intercepts** the request (`j4`), so nothing tested the real
 * contract. This does — against the live service, on purpose.
 *
 * **Opt-in, never by default.** A third-party call in the standard suite would
 * make every run depend on Nominatim's availability and rate limits, and would
 * be rude to a free service. Run it with:
 *
 *     STARTSKY_LIVE_SMOKE=1 bun run test:e2e -- e2e/j8-live-place-lookup.spec.ts
 *
 * CI runs it on `main` only, gated on fork status — same rule as the step this
 * replaces (`1abd28f`), because the `if:` context cannot read variables.
 *
 * **No `User-Agent` is sent, and none can be.** Browsers treat it as a
 * forbidden header, so identification relies on the automatic `Referer`
 * (`site/src/lib/geocode.ts` documents this). The test therefore asserts what
 * the product actually does, rather than a mechanism it does not use — which is
 * also why no CI variable is needed for it.
 */
import { expect, test } from "@playwright/test";
import { decodeExplorer } from "../src/lib/sky/payload.ts";

const LIVE = process.env["STARTSKY_LIVE_SMOKE"] === "1";

test.describe("J8 live place lookup", () => {
  test.skip(!LIVE, "opt-in: set STARTSKY_LIVE_SMOKE=1 to call the live service");

  // One request, and Nominatim asks for at most ~1 req/s. The default timeout is
  // not generous enough for a cold third-party round trip.
  test.setTimeout(30_000);

  test("a real query resolves, and the place reaches the Explorer link", async ({
    page,
  }) => {
    // The map stays closed, so no tile is requested; abort any that would be.
    await page.route(/^https:\/\/tile\.openstreetmap\.org\//, (route) => route.abort());
    await page.goto("/");

    await page.getByLabel("Date and time").fill("2026-01-01T00:00");
    await page.getByLabel("Timezone", { exact: true }).fill("UTC");
    await page
      .getByRole("combobox", { name: "Search for a place" })
      .fill("Times Square, New York, NY");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    // A real result list appears only if the lookup succeeded.
    const first = page.getByRole("option").first();
    await expect(first).toBeVisible({ timeout: 20_000 });
    await first.click();
    await page.getByRole("button", { name: "Explore this sky" }).click();

    await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible({
      timeout: 20_000,
    });

    // The link carries the coordinates Nominatim returned and the label built
    // from them, which is the part that proves the response was parsed, not
    // merely received. Times Square is near 40.758, -73.9855, but the service
    // may refine the value, so assert the neighbourhood and the label.
    const payload = decodeExplorer(new URL(page.url()).hash.slice("#e=".length));
    expect(payload.lat).toBeGreaterThan(40.5);
    expect(payload.lat).toBeLessThan(41);
    expect(payload.lon).toBeGreaterThan(-74.3);
    expect(payload.lon).toBeLessThan(-73.7);
    expect(payload.place).toContain("New York");
  });
});
