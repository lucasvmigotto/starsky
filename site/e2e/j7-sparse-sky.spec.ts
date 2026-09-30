/**
 * J7 — a nearly-empty sky still renders (007 T030).
 *
 * The unit boundary (`boundaries.test.ts`) covers a *synthetic* sky with zero
 * stars. This journey covers what a visitor can actually reach: even at the
 * tightest magnitude limit the catalogue allows, a handful of bright stars stay
 * above the horizon. So the assertion is the one that matters — a sparse sky
 * still produces a poster with its frame, ring and caption, not a blank canvas
 * and not an error.
 *
 * The e2e suite runs against the built site; `reference.test.ts` is where the
 * truly-empty case is pinned.
 */
import { expect, openExport, test, viewerUrl } from "./fixtures.ts";
import { BASE_PAYLOAD } from "./fixtures.ts";
import { encodePayload } from "../src/lib/encode.ts";

/** A payload with the base options, then the overrides on top. */
function sparseFragment(): string {
  return encodePayload({
    ...BASE_PAYLOAD,
    options: {
      ...BASE_PAYLOAD.options,
      // The floor the schema allows: the sparsest sky a share link can describe.
      magnitude_limit: 1.0,
      shape: "circle",
      title: "Almost nothing",
    },
  });
}

test.describe("J7 sparse sky", () => {
  test("a nearly-empty sky renders its frame, ring and caption", async ({
    page,
  }) => {
    await page.goto(viewerUrl(sparseFragment()));

    // The poster renders — not an error state, not a blank screen.
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    await expect(page.getByText("Almost nothing")).toBeVisible();

    // The caption still carries the coordinates: the frame survives an empty
    // sky, which is the whole point of the case.
    const download = page.waitForEvent("download");
    await openExport(page);
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const file = await download;
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const svg = Buffer.concat(chunks).toString("utf-8");

    expect(svg).toContain("<svg");
    expect(svg).toContain("Almost nothing");
    // The ring and the caption survive; only the star field is sparse.
    expect(svg).toContain('stroke="#f5efe0"');
    expect(svg).toContain("40.7580");
  });
});
