/**
 * 017 hardening, A3: every external or async dependency fails visibly.
 *
 * Sky data, the poster font, the Leaflet and page chunks, Nominatim, blocked
 * storage and unreadable links. Each case asserts that the visitor is told
 * (an alert or a status) and that the page is not blank. Nothing here sleeps:
 * the Nominatim timeout runs on Playwright's fake clock.
 */
import type { Page } from "@playwright/test";
import {
  SIRIUS,
  expect,
  explorerUrl,
  fragmentFor,
  studioUrl,
  test,
  viewerUrl,
} from "./fixtures.ts";

/** Something a visitor can read: a heading or an alert, and some text in the page. */
async function expectNotBlank(page: Page): Promise<void> {
  await expect(page.getByRole("alert").or(page.getByRole("heading")).first()).toBeVisible();
  expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
}

/** Answer a data file with a server error. */
async function failData(page: Page, file: "catalog" | "constellations" | "names"): Promise<void> {
  await page.route(new RegExp(`/data/${file}\\.json$`), (route) =>
    route.fulfill({ status: 500, contentType: "text/plain", body: "boom" }),
  );
}

const DATA_FILES = ["catalog", "constellations"] as const;

test.describe("sky data answers 500", () => {
  for (const file of DATA_FILES) {
    test(`${file}.json: landing to Explorer shows an alert`, async ({ page }) => {
      await failData(page, file);
      await page.goto("/");
      await page.getByRole("button", { name: "Explore this sky" }).click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expectNotBlank(page);
    });

    test(`${file}.json: the Explorer link shows an alert and a way back`, async ({ page }) => {
      await failData(page, file);
      await page.goto(explorerUrl(SIRIUS));
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("link", { name: /back/i })).toBeVisible();
    });

    test(`${file}.json: the Studio shows an alert`, async ({ page }) => {
      await failData(page, file);
      await page.goto(studioUrl(fragmentFor()));
      await expect(page.getByRole("alert")).toBeVisible();
      await expectNotBlank(page);
    });

    test(`${file}.json: the poster page shows an alert`, async ({ page }) => {
      await failData(page, file);
      await page.goto(viewerUrl(fragmentFor()));
      await expect(page.getByRole("alert")).toBeVisible();
      await expectNotBlank(page);
    });
  }

  test("names.json is only an extra: the Explorer still opens, with catalogue names", async ({ page }) => {
    await failData(page, "names");
    await page.goto(explorerUrl(SIRIUS));
    await expect(page.getByRole("img", { name: /sky map/i })).toHaveAttribute("data-frames", /^[1-9]\d*$/);
  });
});

test.describe("fonts", () => {
  test("the poster font failing withholds the poster page and says so", async ({ page }) => {
    await page.route("**/*.woff2", (route) => route.abort());
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("alert")).toContainText(/poster font/i);
    await expectNotBlank(page);
  });

  test("the poster font failing in the Studio is not a blank page", async ({ page }) => {
    await page.route("**/*.woff2", (route) => route.abort());
    await page.goto(studioUrl(fragmentFor()));
    await expectNotBlank(page);
    await expect(page.getByRole("alert").or(page.getByRole("img", { name: /night sky poster/i })).first()).toBeVisible();
  });
});

test.describe("code that cannot be fetched", () => {
  test("the Leaflet chunk 404: the landing says the map is unavailable and still works", async ({ page }) => {
    await page.route(/\/assets\/leafletMap-[^/]+\.(js|css)$/, (route) =>
      route.fulfill({ status: 404, contentType: "text/plain", body: "gone" }),
    );
    await page.goto("/");
    await expect(page.getByText(/The map could not be loaded/)).toBeVisible();
    await expectNotBlank(page);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible();
  });

  test("the Explorer chunk 404 shows an alert, not a blank page", async ({ page }) => {
    await page.route(/\/assets\/ExplorerPage-[^/]+\.js$/, (route) =>
      route.fulfill({ status: 404, contentType: "text/plain", body: "gone" }),
    );
    await page.goto(explorerUrl(SIRIUS));
    await expect(page.getByRole("alert")).toBeVisible();
    await expectNotBlank(page);
  });

  test("the Studio chunk 404 shows an alert, not a blank page", async ({ page }) => {
    await page.route(/\/assets\/StudioPage-[^/]+\.js$/, (route) =>
      route.fulfill({ status: 404, contentType: "text/plain", body: "gone" }),
    );
    await page.goto(studioUrl(fragmentFor()));
    await expect(page.getByRole("alert")).toBeVisible();
    await expectNotBlank(page);
  });
});

test.describe("Nominatim", () => {
  const search = (page: Page) => page.getByRole("combobox", { name: "Search for a place" });

  test("a 500 is reported and the page keeps working", async ({ page }) => {
    const { stubSearch } = await import("./fixtures.ts");
    await stubSearch(page, { status: 500 });
    await page.goto("/");
    await search(page).fill("paris");
    await search(page).press("Enter");
    await expect(page.getByRole("alert").or(page.getByRole("status").filter({ hasText: /could not|try again|unavailable/i })).first()).toBeVisible();
    await expectNotBlank(page);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible();
  });

  test("a request that never answers times out into the same error", async ({ page }) => {
    await page.clock.install();
    await page.route(/^https:\/\/nominatim\.openstreetmap\.org\//, () => {
      // Never fulfilled and never aborted: the request hangs.
    });
    await page.goto("/");
    await search(page).fill("paris");
    await search(page).press("Enter");
    await expect(page.getByText(/searching/i).first()).toBeVisible();
    await page.clock.runFor(15_000);
    await expect(page.getByRole("alert").or(page.getByRole("status").filter({ hasText: /could not|try again|unavailable/i })).first()).toBeVisible();
    await expect(page.getByText(/searching/i)).toHaveCount(0);
    await expectNotBlank(page);
  });
});

test.describe("blocked storage", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      for (const name of ["sessionStorage", "localStorage"]) {
        Object.defineProperty(window, name, {
          configurable: true,
          get() {
            throw new DOMException("The operation is insecure.", "SecurityError");
          },
        });
      }
    });
  });

  test("landing, Explorer, Studio and back all work with both stores throwing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeVisible();
    await page.getByRole("button", { name: "Explore this sky" }).click();
    const canvas = page.getByRole("img", { name: /sky map/i });
    await expect(canvas).toHaveAttribute("data-frames", /^[1-9]\d*$/);
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    await page.mouse.move(40, 200);
    await page.mouse.move(60, 220);
    await page.getByRole("button", { name: /poster/i }).first().click();
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    await expectNotBlank(page);
    expect(errors).toEqual([]);
  });

  test("the poster page works with both stores throwing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(viewerUrl(fragmentFor()));
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("unreadable links", () => {
  const OVERSIZE = "A".repeat(4097);
  const GARBAGE = "%%%not-a-link%%%";
  const cases: { name: string; hash: (junk: string) => string; settle: (page: Page) => Promise<void> }[] = [
    {
      name: "#c=",
      hash: (junk) => `#c=${junk}`,
      settle: async (page) => {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByRole("status").filter({ hasText: /./ }).first()).toBeVisible();
      },
    },
    {
      name: "#e=",
      hash: (junk) => `#e=${junk}`,
      settle: async (page) => {
        await expect(page.getByRole("alert")).toBeVisible();
      },
    },
    {
      name: "#studio=",
      hash: (junk) => `#studio=${junk}`,
      settle: async (page) => {
        await expect(page.getByRole("alert")).toBeVisible();
      },
    },
    {
      name: "#s=",
      hash: (junk) => `#s=${junk}`,
      settle: async (page) => {
        await expect(page.getByRole("alert")).toBeVisible();
      },
    },
  ];
  for (const link of cases) {
    for (const [kind, junk] of [
      ["garbage", GARBAGE],
      ["over 4096 characters", OVERSIZE],
    ] as const) {
      test(`${link.name} with ${kind} says so and is not blank`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`/${link.hash(junk)}`);
        await link.settle(page);
        await expectNotBlank(page);
        expect(errors).toEqual([]);
      });
    }
  }
});
