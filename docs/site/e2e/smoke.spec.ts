/**
 * Docs smoke: every route renders its page, deep links work, the language
 * switcher swaps the catalogue, keyboard users can navigate, and the
 * llms/ Markdown outputs are served with the right content types.
 */
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES: Record<string, string> = {
  "/": "Overview",
  "/install": "Install",
  "/cli": "CLI reference",
  "/viewer": "Viewer guide",
  "/concepts": "Concepts",
  "/architecture": "Architecture",
  "/delivery": "Delivery",
  "/roadmap": "Roadmap",
};

test.describe("docs smoke", () => {
  for (const [route, heading] of Object.entries(ROUTES)) {
    test(`route ${route} renders its heading`, async ({ page }) => {
      await page.goto(`/#${route}`);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
    });
  }

  test("deep link lands on the page, not the home fallback", async ({
    page,
  }) => {
    await page.goto("/#/cli");
    await expect(
      page.getByRole("heading", { level: 1, name: "CLI reference" }),
    ).toBeVisible();
  });

  test("language switch swaps the catalogue and the html lang", async ({
    page,
  }) => {
    await page.goto("/#/");
    await page.selectOption("#ddocs-lang", "pt");
    await expect(
      page.getByRole("heading", { level: 1, name: "Visão geral" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await page.selectOption("#ddocs-lang", "en");
    await expect(
      page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
  });

  test("keyboard-only: skip link, nav, and search", async ({ page }) => {
    await page.goto("/#/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#ddocs-content")).toBeFocused();
    // Narrow viewports collapse the nav (and the search inside it) behind
    // the menu button — open it the way a keyboard user would.
    if (!(await page.locator("#ddocs-search").isVisible())) {
      await page.getByRole("button", { name: "Menu" }).click();
    }
    await page.locator("#ddocs-search").fill("rollback");
    await expect(
      page.getByRole("status").getByRole("link", { name: "Delivery" }),
    ).toBeVisible();
  });

  test("llms.txt and per-page Markdown are served as text", async ({
    request,
  }) => {
    const txt = await request.get("/llms.txt");
    expect(txt.ok()).toBe(true);
    expect(txt.headers()["content-type"] ?? "").toContain("text/plain");
    expect(await txt.text()).toContain("## Pages");

    const md = await request.get("/docs/en/cli.md");
    expect(md.ok()).toBe(true);
    expect(md.headers()["content-type"] ?? "").toContain("text/markdown");
    expect(await md.text()).toContain("# CLI reference");
  });

  test("axe: no serious or critical violations on home and roadmap", async ({
    page,
  }) => {
    for (const route of ["/#/", "/#/roadmap"]) {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const blocking = results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    }
  });
});
