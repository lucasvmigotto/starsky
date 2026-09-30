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

const LIVE = process.env["STARTSKY_LIVE_SMOKE"] === "1";

test.describe("J8 live place lookup", () => {
  test.skip(!LIVE, "opt-in: set STARTSKY_LIVE_SMOKE=1 to call the live service");

  // One request, and Nominatim asks for at most ~1 req/s. The default timeout is
  // not generous enough for a cold third-party round trip.
  test.setTimeout(30_000);

  test("a real query resolves and reaches the poster caption", async ({
    page,
  }) => {
    await page.goto("/");

    // Place mode, a real query, and the fields the form requires.
    await page.getByRole("radio", { name: "place", exact: true }).check();
    await page.locator("#landing-place").fill("Times Square, New York, NY");
    await page.locator("#landing-when").fill("2026-01-01T00:00");
    await page.locator("#landing-tz").fill("UTC");

    await page.getByRole("button", { name: /show my sky/i }).click();

    // The poster renders — which only happens if the lookup succeeded.
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible({ timeout: 20_000 });

    // The resolved label reaches the caption, which is the part that proves the
    // response was parsed, not merely received.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const file = await download;
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const svg = Buffer.concat(chunks).toString("utf-8");

    // The caption carries the coordinates Nominatim returned — Times Square is
    // near 40.758, -73.9855, but the point is that *a* coordinate pair arrived
    // and was formatted, not the exact value (the service may refine it).
    expect(svg).toMatch(/4\d\.\d{4}°N/);
    expect(svg).toMatch(/7\d\.\d{4}°W/);
    expect(svg).toContain("New York");
  });
});
