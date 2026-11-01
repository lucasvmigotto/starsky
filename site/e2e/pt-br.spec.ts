/**
 * Brazilian Portuguese (018-pt-br, BCR-0015) in a real browser.
 *
 * The interface follows the visitor: the browser's language on a first visit,
 * then the footer switcher, remembered on this browser, re-rendering in place.
 * The poster follows its link: `lang` in `#s=` / `#studio=` decides the
 * caption's date for every recipient, whatever their browser says.
 *
 * Every test runs behind the shared fixtures' tile and geocoder stubs, so none
 * of them reaches a real server.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { decodeShareFragment } from "../src/lib/share.ts";
import {
  SIRIUS,
  expect,
  explorerUrl,
  fragmentFor,
  openExport,
  readDownload,
  studioUrl,
  test,
  viewerUrl,
} from "./fixtures.ts";

const PT_TITLE = "De onde você quer explorar o céu?";
const EN_TITLE = "Where do you want to explore the sky from?";
const PT_POSTER = /pôster do céu noturno/i;
const PT_SKY_MAP = /mapa do céu/i;
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** A moment whose caption reads differently in each language. */
const XMAS = { when_utc: "2024-12-25T10:00:00Z", tz: "Australia/Sydney" } as const;
const EN_CAPTION = "40.7580°N, 73.9855°W — Times Square · Dec 25, 2024, 9:00 PM Australia/Sydney";
const PT_CAPTION = "40.7580°N, 73.9855°W — Times Square · 25 de dez. de 2024, 21:00 Australia/Sydney";

async function blocking(page: Page): Promise<string> {
  // `color-contrast` is checked against computed colours by contrast.spec.ts
  // (axe misreads Tailwind's oklab); see a11y.spec.ts.
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(["color-contrast"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`)
    .join("\n");
}

function languageSelect(page: Page, name: "Idioma" | "Language") {
  return page.locator("footer").getByRole("combobox", { name, exact: true });
}

function draftOf(page: Page): ReturnType<typeof decodeShareFragment> {
  const hash = new URL(page.url()).hash;
  expect(hash.startsWith("#studio=")).toBe(true);
  return decodeShareFragment(hash.slice("#studio=".length));
}

/** The Explorer opens with its controls hidden; a pointer move brings them back. */
async function wakeExplorer(page: Page): Promise<void> {
  const canvas = page.getByRole("img", { name: PT_SKY_MAP });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("the Explorer canvas has no box");
  await page.mouse.move(box.x + 24, box.y + box.height * 0.55);
  await page.mouse.move(box.x + 30, box.y + box.height * 0.55 + 4);
  await expect(page.locator(".explorer-stage-inner")).toHaveAttribute("data-chrome", "visible");
}

test.describe("a pt-BR browser", () => {
  test.use({ locale: "pt-BR" });

  test("sees Portuguese on the first visit, with <html lang> to match", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("button", { name: "Explorar este céu" })).toBeVisible();
    await expect(languageSelect(page, "Idioma")).toHaveValue("pt-BR");
    // Attribution notices stay as they are; only their labels are translated.
    await expect(page.locator("footer")).toContainText("© OpenStreetMap contributors");
    await expect(page.locator("footer")).toContainText("Estrelas: Hipparcos");
  });

  test("switches to English in place, keeps the form, and remembers the choice across a reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
    await page.getByLabel("Título", { exact: true }).fill("Nossa noite");
    await languageSelect(page, "Idioma").selectOption("en-US");
    // Re-rendered, not reloaded: the typed title is still in its field.
    await expect(page.getByRole("heading", { level: 1, name: EN_TITLE })).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Nossa noite");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    expect(await page.evaluate(() => window.localStorage.getItem("starsky.locale"))).toBe("en-US");

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: EN_TITLE })).toBeVisible();
    await expect(languageSelect(page, "Language")).toHaveValue("en-US");
  });

  test("still works when site storage is blocked", async ({ page, consoleErrors }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
    await languageSelect(page, "Idioma").selectOption("en-US");
    await expect(page.getByRole("heading", { level: 1, name: EN_TITLE })).toBeVisible();
    // Nothing could be stored, so a reload falls back to the browser's language.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
    expect(consoleErrors.filter((e) => /storage|insecure|locale/i.test(e))).toEqual([]);
  });

  test("the landing, Explorer, Studio and poster page have no serious or critical axe violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
    expect(await blocking(page)).toBe("");

    await page.goto(explorerUrl(SIRIUS));
    await expect(page.getByRole("img", { name: PT_SKY_MAP })).toBeVisible();
    expect(await blocking(page)).toBe("");

    await page.goto(studioUrl(fragmentFor({ lang: "pt-BR" })));
    await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
    expect(await blocking(page)).toBe("");

    await page.goto(viewerUrl(fragmentFor({ lang: "pt-BR" })));
    await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
    expect(await blocking(page)).toBe("");
  });

  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`the landing and the Studio need no page scroll at ${width.toString()}x${height.toString()}`, async ({ page }) => {
      test.skip(test.info().project.name === "mobile-chromium", "a desktop layout");
      await page.setViewportSize({ width, height });
      const fits = (): Promise<boolean> =>
        page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);

      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
      await expect(page.locator(".leaflet-tile-loaded").first()).toBeAttached();
      expect(await fits()).toBe(true);
      // The footer holds the credits on one line, then the switcher and the version.
      const credits = page.locator("footer .atlas-footer-info .atlas-footer-meta");
      const lineHeight = await credits.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      expect((await credits.boundingBox())?.height ?? 99).toBeLessThanOrEqual(lineHeight * 1.5);

      await page.goto(studioUrl(fragmentFor()));
      await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
      expect(await fits()).toBe(true);

      // The poster page has the most in its footer row: the actions too.
      await page.goto(viewerUrl(fragmentFor()));
      await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
      await expect(page.locator("footer .atlas-footer-actions")).toBeVisible();
      expect((await credits.boundingBox())?.height ?? 99).toBeLessThanOrEqual(lineHeight * 1.5);
    });
  }

  test("holds the longer strings at 390 px without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = (): Promise<number> =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: PT_TITLE })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
    await openExport(page, "Exportar");
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.goto(viewerUrl(fragmentFor({ lang: "pt-BR" })));
    await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.goto(explorerUrl(SIRIUS));
    await expect(page.getByRole("img", { name: PT_SKY_MAP })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  test("Create poster starts the Studio in pt-BR, and the poster language is the Studio's to change", async ({ page }) => {
    await page.goto(explorerUrl(SIRIUS));
    const bar = page.getByRole("toolbar", { name: "Controles do mapa" });
    await expect(bar).toBeVisible();
    await wakeExplorer(page);
    await bar.getByRole("button", { name: "Criar pôster" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Estúdio de pôster" })).toBeVisible();
    const select = page.getByLabel("Idioma do pôster", { exact: true });
    await expect(select).toHaveValue("pt-BR");
    expect(draftOf(page).lang).toBe("pt-BR");

    // The exported file draws the date in the poster's language.
    const download = page.waitForEvent("download");
    await openExport(page, "Exportar");
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const svg = (await readDownload(await download)).toString("utf-8");
    expect(svg).toContain("1 de jan. de 2026, 05:00 UTC");

    await select.selectOption("en-US");
    await expect.poll(() => "lang" in draftOf(page)).toBe(false);
  });

  test("a pt-BR poster link draws a pt-BR caption, and a link without lang an en-US one", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor({ ...XMAS, lang: "pt-BR" })));
    await expect(page.getByText(PT_CAPTION, { exact: true })).toBeAttached();

    await page.goto(viewerUrl(fragmentFor(XMAS)));
    await expect(page.getByText(EN_CAPTION, { exact: true })).toBeAttached();
  });
});

test.describe("an en-US browser", () => {
  test.use({ locale: "en-US" });

  test("receiving a pt-BR poster link still sees the pt-BR caption, around an English interface", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor({ ...XMAS, lang: "pt-BR" })));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    // The artifact (the canvas's text alternative) is the link's language…
    await expect(page.getByText(PT_CAPTION, { exact: true })).toBeAttached();
    // …and the moment line under the title is the interface's.
    await expect(page.getByText("Dec 25, 2024, 9:00 PM Australia/Sydney", { exact: true })).toBeVisible();
  });

  test("switching language on the Viewer re-renders the interface and leaves the poster alone", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor(XMAS)));
    const poster = page.getByRole("img", { name: /night sky poster/i });
    await expect(poster).toBeVisible();
    const before = await poster.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
    const url = page.url();

    await languageSelect(page, "Language").selectOption("pt-BR");
    await expect(page.getByText("25 de dez. de 2024, 21:00 Australia/Sydney", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: PT_POSTER })).toBeVisible();
    // The link and the drawn poster are untouched; its caption stays en-US.
    expect(page.url()).toBe(url);
    await expect(page.getByText(EN_CAPTION, { exact: true })).toBeAttached();
    expect(await page.getByRole("img", { name: PT_POSTER }).evaluate((el) => (el as HTMLCanvasElement).toDataURL())).toBe(before);
  });

  test("switching language in the Studio keeps the draft", async ({ page }) => {
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill("Draft night");
    await expect.poll(() => draftOf(page).options.title).toBe("Draft night");
    const hash = new URL(page.url()).hash;

    await languageSelect(page, "Language").selectOption("pt-BR");
    await expect(page.getByRole("heading", { level: 1, name: "Estúdio de pôster" })).toBeAttached();
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Draft night");
    // The interface changed, not the poster: the draft keeps its bytes and has no lang.
    expect(new URL(page.url()).hash).toBe(hash);
    await expect(page.getByLabel("Idioma do pôster", { exact: true })).toHaveValue("en-US");
  });
});
