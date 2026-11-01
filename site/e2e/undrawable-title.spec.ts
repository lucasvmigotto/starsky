/**
 * An undrawable title, on both paths (007 T042, charter C1's finding).
 *
 * The poster face covers Latin-1 accents and punctuation but has no glyph for
 * emoji or CJK. Left alone, those characters render as a notdef box — silently,
 * and differently in each export, so the same title came out of the same viewer
 * as three different posters. The two paths now differ deliberately:
 *
 *   - **Authoring** (the Studio's Title field, reached from the landing's
 *     "Explore this sky", then the Explorer's "Create poster") rejects and names the character. The visitor
 *     typed the title and can fix it, so refusing costs them nothing.
 *   - **Decode** strips the character, renders, and says so. The recipient
 *     cannot fix the sender's title, and a dead link is worse than an adjusted
 *     one — but an *unmentioned* adjustment would be the same dishonesty one
 *     level up.
 *
 * The coverage answer now comes from parsing the bundled font's `cmap`, which
 * is deterministic and identical in every environment, so the *decision* is unit
 * tested in `glyphs.test.ts`. What is left here is the part only a browser can
 * judge: that the Studio rejects, the viewer adjusts, the notice appears, and the
 * poster that results matches what the visitor was told.
 */
import { decodeShareFragment } from "../src/lib/share.ts";
import {
  BASE_PAYLOAD,
  expect,
  fragmentFor,
  openExport,
  test,
  viewerUrl,
  wakeChrome,
} from "./fixtures.ts";

const TITLE_INPUT = "#studio-title";

/**
 * Reach the Studio from the landing and type a title there.
 *
 * Poster options left the landing (013-location-first), so the authoring path
 * for a title is now: the landing's "Explore this sky", the Explorer's "Create
 * poster", then the Studio's Title field. No place is searched, so the test does not depend on Nominatim,
 * and the moment is set explicitly so the click does not depend on the clock.
 */
async function typeTitle(
  page: import("@playwright/test").Page,
  title: string,
): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Date and time").fill("2026-01-01T00:00");
  await page.getByLabel("Timezone", { exact: true }).fill("UTC");
  await page.getByRole("button", { name: "Explore this sky" }).click();
  await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible();
  await wakeChrome(page);
  await page.getByRole("toolbar", { name: "Map controls" }).getByRole("button", { name: "Create poster" }).click();
  await expect(
    page.getByRole("img", { name: /night sky poster/i }),
  ).toBeVisible();
  await page.locator(TITLE_INPUT).fill(title);
}

test.describe("a title the poster face cannot draw", () => {
  test("the Studio refuses an emoji title and names the character", async ({
    page,
  }) => {
    await typeTitle(page, "E2E 🌌");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("🌌");
    // The visitor keeps their input so they can edit it rather than retype it,
    // and the refused title never reaches the draft in the address.
    await expect(page.locator(TITLE_INPUT)).toHaveValue("E2E 🌌");
    expect(new URL(page.url()).hash.startsWith("#studio=")).toBe(true);
    const draft = decodeShareFragment(new URL(page.url()).hash.slice("#studio=".length));
    expect(draft.options.title).toBeNull();
  });

  test("the Studio still accepts a title of accents", async ({ page }) => {
    await typeTitle(page, "Céu Austral");

    await expect(page.getByText("Céu Austral")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("a shared link with an emoji renders, and says the title was adjusted", async ({
    page,
  }) => {
    const fragment = fragmentFor({
      ...BASE_PAYLOAD,
      options: { ...BASE_PAYLOAD.options, title: "E2E 🌌 Night" },
    });
    await page.goto(viewerUrl(fragment));

    // The link still works — this is the whole point of not rejecting here.
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();

    // The adjustment is stated rather than hidden, and it names *only* the emoji.
    // That last part is the real assertion: the poster renders on an ASCII title,
    // so if the probe were measuring a fallback it would strip these letters too
    // and the notice would name them. It did, once — CI, 2026-10-02, reported
    // `h`, `S` and `u` of "E2E Night" / "Times Square" as undrawable.
    const note = page.getByRole("status").filter({ hasText: /cannot draw/i });
    await expect(note).toBeVisible();

    // Assert on the *listed* characters, not on substrings of the sentence: the
    // copy around them ("which the poster face cannot draw") is full of ASCII
    // letters, so a per-letter `not.toContainText` would be meaningless. The
    // removed set must be exactly the emoji.
    const text = (await note.textContent()) ?? "";
    const listed = /contained (.*?), which/.exec(text)?.[1] ?? "";
    expect(
      listed.trim(),
      `the notice named ${JSON.stringify(listed)} — only the emoji should be removed`,
    ).toBe("🌌");

    // And what renders is the adjusted title, so the poster and its exports
    // agree with what the visitor was told.
    await expect(page.getByText("E2E Night")).toBeVisible();
    // Deliberately *not* asserting the emoji is absent from the page: the
    // notice names the character it dropped, which is the whole point, so
    // counting `🌌` across the page finds it there. Scoped to the title
    // instead — the caption/header echo the adjusted string and nothing else.
    await expect(page.getByRole("img", { name: /E2E Night/ })).toBeVisible();
  });

  /**
   * The PDF half of the finding, which the C2 sweep could not reach: `exportPdf`
   * loads the face through `fetch`, so it only runs in a browser.
   *
   * The risk is specific. BCR-0006 made the PDF embed a *subset* of the face
   * "carrying exactly the glyphs the poster can draw" (`export.ts:260`), and a
   * character the face does not contain has no outline to subset. So the
   * question is not only "is the title stripped on this path" — which the test
   * above answers — but **does the export still produce a valid, vector,
   * font-embedded PDF when a glyph was dropped**. A subsetter handed a missing
   * glyph could plausibly throw, or silently emit a broken font.
   */
  test("the PDF export survives a title whose glyph was dropped", async ({
    page,
  }) => {
    const fragment = fragmentFor({
      ...BASE_PAYLOAD,
      options: { ...BASE_PAYLOAD.options, title: "E2E 🌌 Night" },
    });
    await page.goto(viewerUrl(fragment));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
    // Wait for the adjustment, so the export carries the stripped title.
    await expect(
      page.getByRole("status").filter({ hasText: /cannot draw/i }),
    ).toBeVisible();

    await openExport(page);
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
    const raw = pdf.toString("latin1");

    // Same three contracts `j3` asserts, on the harder input: a real PDF, still
    // vector, and still carrying an embedded font rather than falling back to a
    // standard one.
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(raw).not.toMatch(/\/Subtype\s*\/Image/);
    expect(raw, "the font must still be embedded after subsetting").toMatch(
      /\/FontFile2|\/FontFile3|\/FontFile/,
    );
    // And the text is still selectable — a broken subset would show up here
    // first, as outlines or as nothing at all.
    expect(raw).toMatch(/BT[\s\S]{0,400}?(Tj|TJ)/);
    // The stripped title is what got drawn, so the artefact matches the poster.
    expect(pdf.length).toBeGreaterThan(5_000);
  });

  test("a shared link whose title is drawable is left alone and unannounced", async ({
    page,
  }) => {
    const fragment = fragmentFor({
      ...BASE_PAYLOAD,
      options: { ...BASE_PAYLOAD.options, title: "E2E Céu Austral" },
    });
    await page.goto(viewerUrl(fragment));

    await expect(page.getByText("E2E Céu Austral")).toBeVisible();
    // No warning: announcing an adjustment that did not happen would train
    // people to ignore the notice. This also guards the probe against
    // over-reporting — the fix for the mass-rejection bug fails *open*, so this
    // is the assertion that keeps it from quietly disabling the feature.
    await expect(
      page.getByRole("status").filter({ hasText: /cannot draw/i }),
    ).toHaveCount(0);
  });
});
