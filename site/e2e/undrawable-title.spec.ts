/**
 * An undrawable title, on both paths (007 T042, charter C1's finding).
 *
 * The poster face covers Latin-1 accents and punctuation but has no glyph for
 * emoji or CJK. Left alone, those characters render as a notdef box — silently,
 * and differently in each export, so the same title came out of the same viewer
 * as three different posters. The two paths now differ deliberately:
 *
 *   - **Authoring** rejects and names the character. The visitor typed the
 *     title and has made nothing yet, so refusing costs them nothing.
 *   - **Decode** strips the character, renders, and says so. The recipient
 *     cannot fix the sender's title, and a dead link is worse than an adjusted
 *     one — but an *unmentioned* adjustment would be the same dishonesty one
 *     level up.
 *
 * These are e2e rather than unit tests on purpose: the whole mechanism is
 * `document.fonts.check` against the real bundled face, which does not exist
 * under bun. A unit test with a fake probe proves the branching, not that the
 * face agrees — `glyph-coverage.test.ts` covers the face from the other side.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";
import { BASE_PAYLOAD } from "./fixtures.ts";

// Ids, matching `j4-place-lookup.spec.ts`. Not `getByLabel`: the title field
// lives inside the collapsed "Render options" `<details>`, so it is in the DOM
// but not visible until the disclosure is opened — and a `getByLabel` that
// resolves to a hidden input fails on `fill` with a 30s timeout rather than
// anything that names the real problem.
const TITLE_INPUT = "#landing-title";
const DISCLOSURE = "Render options";

/**
 * Wait until the poster face is genuinely measurable.
 *
 * Not just "the canvas has something to measure" — the face has to be applied.
 * `document.fonts.ready` resolves when pending loads settle, which is not the
 * same instant the canvas honours the family, and probing in between measures a
 * fallback and reports ASCII letters as undrawable. That bug shipped once and
 * stripped the letters out of every title on the page (CI, 2026-10-02).
 *
 * Probed through a real element rather than `page.evaluate`, because the check
 * that matters is the one the page itself makes.
 */
async function waitForDrawableFont(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.waitForFunction(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx === null) return false;
    ctx.font = '48px "Cormorant Garamond"';
    // A present glyph must not advance like U+FFFF.
    return (
      Math.abs(ctx.measureText("N").width - ctx.measureText("￿").width) > 0.01
    );
  });
}

/** Fill the landing form's title and submit it. */
async function submitWithTitle(
  page: import("@playwright/test").Page,
  title: string,
): Promise<void> {
  await page.goto("/");
  await waitForDrawableFont(page);
  await page.getByText(DISCLOSURE, { exact: true }).click();
  await page.locator(TITLE_INPUT).fill(title);
  await page.getByRole("button", { name: /show my sky/i }).click();
}

test.describe("a title the poster face cannot draw", () => {
  test("the form refuses an emoji title and names the character", async ({
    page,
  }) => {
    await submitWithTitle(page, "E2E 🌌");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("🌌");
    // And nothing was created: no poster rendered, and the visitor keeps their
    // input so they can edit it rather than retype it.
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toHaveCount(0);
    await expect(page.locator(TITLE_INPUT)).toHaveValue("E2E 🌌");
  });

  test("the form still accepts a title of accents", async ({ page }) => {
    await submitWithTitle(page, "Céu Austral");

    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();
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
    await expect(page.getByText("🌌")).toHaveCount(0);
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
