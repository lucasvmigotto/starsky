/**
 * 013-location-first: the landing asks where to explore from, and opens the
 * Explorer (or the Studio) there. Tiles and the geocoder are stubbed for every
 * test (see `fixtures.ts`): nothing here reaches OpenStreetMap, and the map's
 * policy checks (ADR-0008) are made against the stubs.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { creationFragmentFromHash, decodeCreation, encodeCreation } from "../src/lib/landing/creation.ts";
import { decodeExplorer } from "../src/lib/sky/payload.ts";
import { decodeDraft } from "../src/lib/studio/draft.ts";
import { TILE_HOST, expect, placeOptions, stubSearch, test, wakeChrome } from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const EIFFEL = {
  lat: "48.8584",
  lon: "2.2945",
  display_name: "Eiffel Tower, Paris, France",
  name: "Eiffel Tower",
  address: { city: "Paris", country: "France" },
};
const TOKYO = {
  lat: "35.6762",
  lon: "139.6503",
  display_name: "Tokyo, Japan",
  name: "Tokyo",
  address: { city: "Tokyo", country: "Japan" },
};

const search = (page: Page) => page.getByRole("combobox", { name: "Search for a place" });
const searchButton = (page: Page) => page.getByRole("button", { name: "Search", exact: true });
const mapRegion = (page: Page) => page.getByRole("region", { name: "Map for choosing a place" });
const canvas = (page: Page) => page.locator(".landing-map-canvas");

async function openLanding(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Where do you want to explore the sky from?" })).toBeVisible();
}

/** The map is always on the page; wait until Leaflet has drawn a tile. */
async function mapReady(page: Page): Promise<void> {
  await expect(mapRegion(page)).toBeVisible();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeAttached();
}

const coordinatesSwitch = (page: Page) => page.getByRole("switch", { name: "Coordinates" });

/** A fixed moment, so the link does not depend on the clock. */
async function chooseMoment(page: Page): Promise<void> {
  await page.getByLabel("Date and time").fill("2026-01-01T00:00");
  await page.getByLabel("Timezone", { exact: true }).fill("UTC");
}

function hashPayload(page: Page): ReturnType<typeof decodeExplorer> {
  return decodeExplorer(new URL(page.url()).hash.slice("#e=".length));
}

async function expectExplorer(page: Page): Promise<void> {
  await expect(page.getByRole("img", { name: /sky map/i })).toBeVisible();
  expect(new URL(page.url()).hash.startsWith("#e=")).toBe(true);
}

test.describe("the question", () => {
  test("asks where to explore from: search with the Coordinates switch, the map right under, the moment, one button", async ({ page, network }) => {
    await openLanding(page);
    await expect(search(page)).toBeVisible();
    await expect(coordinatesSwitch(page)).toHaveAttribute("aria-checked", "false");
    await mapReady(page);
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Date and time")).toBeVisible();
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeVisible();
    await expect(page.getByRole("button", { name: /poster/i })).toHaveCount(0);
    await expect(page.locator("main button.atlas-btn")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Load a random sky" })).toBeVisible();
    await expect(page.getByRole("button", { name: /show map|hide map|expand map|skip the map/i })).toHaveCount(0);
    // The identity: header and the footer with the version link.
    await expect(page.getByRole("link", { name: "Starsky", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^starsky@v\d/ })).toBeVisible();
    // Order: field row, then the map, the credit and hint, then the summary.
    const y = async (locator: ReturnType<Page["locator"]>): Promise<number> => (await locator.boundingBox())?.y ?? -1;
    const order = [await y(search(page)), await y(page.locator(".landing-map-box")), await y(page.getByText("Search by Nominatim")), await y(page.getByText("Click or drag the pin")), await y(page.locator(".landing-selected"))];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The geocoder is called only when the visitor searches.
    expect(network.searchRequests).toEqual([]);
  });

  test("offers the Title, and in Advanced only the limiting magnitude", async ({ page }) => {
    await openLanding(page);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByText("Appearance", { exact: true })).toHaveCount(0);
    await page.getByText("Advanced", { exact: true }).click();
    await expect(page.getByLabel("Limiting magnitude")).toBeVisible();
    for (const label of ["Projection", "Fisheye strength", "Glow", "Constellation lines"]) {
      await expect(page.getByLabel(label)).toHaveCount(0);
    }
    await expect(page.locator("details input, details select")).toHaveCount(1);
  });

  test("a title typed here reaches the Explorer's moment line and then the Studio", async ({ page }) => {
    await openLanding(page);
    await chooseMoment(page);
    await page.getByLabel("Title").fill("Our first flat");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page).title).toBe("Our first flat");
    await expect(page.locator(".explorer-moment")).toContainText("Our first flat");
    await wakeChrome(page);
    await page.getByRole("toolbar", { name: "Map controls" }).getByRole("button", { name: "Create poster" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Poster Studio" })).toBeVisible();
    await expect(page.locator(".atlas-studio-preview .atlas-moment")).toContainText("Our first flat");
    expect(decodeDraft(new URL(page.url()).hash.slice("#studio=".length)).options.title).toBe("Our first flat");
  });

  test("an empty title stays null in the link", async ({ page }) => {
    await openLanding(page);
    await chooseMoment(page);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page).title).toBeNull();
  });

  test("a title the poster face cannot draw is refused in place, with the Studio's message", async ({ page }) => {
    await openLanding(page);
    await chooseMoment(page);
    await page.getByLabel("Title").fill("Night 🌌");
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("🌌");
    await expect(page.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    expect(new URL(page.url()).hash).not.toMatch(/^#(e|s|studio)=/);
    await page.getByLabel("Title").fill("Céu Austral");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page).title).toBe("Céu Austral");
  });
});

test.describe("the map (ADR-0008)", () => {
  test("requests only the tiles in view, keeps the Referer and credits OpenStreetMap", async ({ page, network }) => {
    const tile = page.waitForRequest((request) => request.url().includes(TILE_HOST));
    await openLanding(page);
    await mapReady(page);
    const first = await tile;
    // A few tiles for one view, never a sweep of the world.
    expect(network.tileRequests.length).toBeLessThan(40);
    expect(first.url()).toMatch(new RegExp(`^https://${TILE_HOST.replace(/\./g, "\\.")}/\\d+/\\d+/\\d+\\.png$`));
    expect(await first.headerValue("referer")).toMatch(/^http:\/\/127\.0\.0\.1/);

    const credit = mapRegion(page).locator(".leaflet-control-attribution");
    await expect(credit).toBeVisible();
    await expect(credit).toContainText("© OpenStreetMap contributors");
    await expect(credit.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    await expect(credit.getByRole("link", { name: "Report a problem" })).toHaveAttribute("href", "https://www.openstreetmap.org/fixthemap");
  });

  test("a click on the map drops a pin: no name, formatted coordinates, and an #e= link with a null place", async ({ page }) => {
    await openLanding(page);
    await chooseMoment(page);
    await mapReady(page);
    const before = await page.locator(".landing-selected").innerText();
    await canvas(page).click({ position: { x: 120, y: 70 } });
    const summary = page.locator(".landing-selected");
    await expect(summary).toContainText("Dropped pin");
    await expect(summary).toContainText(/\d+\.\d{4}°[NS], \d+\.\d{4}°[EW]/);
    expect(await summary.innerText()).not.toBe(before);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page).place).toBeNull();
  });

  test("dragging the marker sets the place the same way", async ({ page }) => {
    await openLanding(page);
    await mapReady(page);
    const marker = page.locator(".leaflet-marker-icon");
    await expect(marker).toBeVisible();
    const box = await marker.boundingBox();
    if (!box) throw new Error("the marker has no box");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 40, y + 30, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator(".landing-selected")).toContainText("Dropped pin");
  });

  test("clicking the map leaves the summary uncovered and the layout where it was", async ({ page }) => {
    await openLanding(page);
    await mapReady(page);
    const box = async (): Promise<number[]> => {
      const b = await page.locator(".landing-map-box").boundingBox();
      const c = await page.locator(".landing-selected").boundingBox();
      return [b?.y ?? 0, b?.height ?? 0, c?.y ?? 0];
    };
    const before = await box();
    await canvas(page).click({ position: { x: 120, y: 70 } });
    await expect(page.locator(".landing-selected")).toContainText("Dropped pin");
    expect(await box()).toEqual(before);
    const covered = await page.evaluate(() => {
      const target = document.querySelector(".landing-selected");
      if (!target) return "missing";
      const r = target.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return target.contains(top) ? "clear" : String(top?.className);
    });
    expect(covered).toBe("clear");
  });

  test("the map is not a tab stop that traps the keyboard", async ({ page }) => {
    await openLanding(page);
    await mapReady(page);
    await expect(page.locator(".landing-map-canvas")).not.toHaveAttribute("tabindex", /.+/);
    await coordinatesSwitch(page).focus();
    // Tabbing from the switch passes the map's own controls and reaches the action.
    let reached = false;
    for (let i = 0; i < 20 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.getByRole("button", { name: "Explore this sky" }).evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
  });

  test("tiles that cannot load are reported in the map's place and nothing else stops", async ({ page }) => {
    await page.route(/^https:\/\/tile\.openstreetmap\.org\//, (route) => route.abort());
    await openLanding(page);
    await chooseMoment(page);
    await expect(page.getByText("The map tiles could not be loaded. Search still works, or turn on Coordinates to type a place.")).toBeVisible();
    await coordinatesSwitch(page).click();
    await page.getByLabel("Latitude").fill("-12.5");
    await page.getByLabel("Longitude").fill("130.25");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page)).toMatchObject({ lat: -12.5, lon: 130.25, place: null });
  });

  test("a map chunk that cannot load is reported in the same box, which keeps its size", async ({ page }) => {
    await page.route(/\/assets\/leafletMap-[^/]+\.(js|css)$/, (route) => route.abort());
    await openLanding(page);
    await chooseMoment(page);
    const notice = page.getByText("The map could not be loaded. Search still works, or turn on Coordinates to type a place.");
    await expect(notice).toBeVisible();
    expect((await page.locator(".landing-map-box").boundingBox())?.height).toBeGreaterThanOrEqual(140);
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
  });
});

test.describe("search", () => {
  test("lists matches, announces the count, and a chosen place moves the page and the link", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL, TOKYO]);
    await openLanding(page);
    await chooseMoment(page);
    await search(page).fill("tower");
    await searchButton(page).click();
    await expect(placeOptions(page)).toHaveCount(2);
    await expect(page.getByRole("status").filter({ hasText: "2 places found" })).toBeVisible();
    expect(network.searchRequests).toHaveLength(1);
    await search(page).press("ArrowDown");
    await expect(placeOptions(page).nth(1)).toHaveAttribute("aria-selected", "true");
    await search(page).press("ArrowUp");
    await search(page).press("Enter");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(page.locator(".landing-selected")).toContainText("Eiffel Tower, Paris, France");
    await expect(page.locator(".landing-selected")).toContainText("48.8584°N, 2.2945°E");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page)).toMatchObject({
      lat: 48.8584,
      lon: 2.2945,
      place: "Eiffel Tower, Paris, France",
      tz: "UTC",
      when_utc: "2026-01-01T00:00:00Z",
    });
  });

  test("a chosen place brings the open map there", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await mapReady(page);
    await search(page).fill("eiffel");
    await search(page).press("Enter");
    await placeOptions(page).first().click();
    await expect(page.locator(".landing-selected")).toContainText("Eiffel Tower");
    // The map pans and zooms to Paris: the tile that holds it at zoom 9 is asked for.
    await expect.poll(() => network.tileRequests.some((url) => url.endsWith("/9/259/176.png"))).toBe(true);
  });

  test("a pin dropped after a search clears the search text, so the field never contradicts the summary", async ({ page }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await mapReady(page);
    await search(page).fill("eiffel");
    await search(page).press("Enter");
    await placeOptions(page).first().click();
    await expect(search(page)).toHaveValue("Eiffel Tower, Paris, France");
    await canvas(page).click({ position: { x: 120, y: 70 } });
    await expect(page.locator(".landing-selected")).toContainText("Dropped pin");
    await expect(search(page)).toHaveValue("");
  });

  test("Escape closes the list and keeps the text", async ({ page }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await search(page).fill("eiffel");
    await search(page).press("Enter");
    await expect(placeOptions(page)).toHaveCount(1);
    await search(page).press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(search(page)).toHaveValue("eiffel");
  });

  test("typing sends no request at all, and the button does", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await search(page).pressSequentially("eiffel tower", { delay: 30 });
    // Past the old 400 ms pause: nothing was asked, nothing is listed.
    await page.waitForTimeout(700);
    expect(network.searchRequests).toHaveLength(0);
    await expect(placeOptions(page)).toHaveCount(0);
    await searchButton(page).click();
    await expect(placeOptions(page)).toHaveCount(1);
    expect(network.searchRequests).toHaveLength(1);
  });

  test("leaving the field with new text searches once", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await search(page).fill("eiffel");
    expect(network.searchRequests).toHaveLength(0);
    await page.getByLabel("Date and time").focus();
    await expect(page.getByRole("status").filter({ hasText: "1 place found" })).toBeVisible();
    expect(network.searchRequests).toHaveLength(1);
    await search(page).focus();
    await page.getByLabel("Date and time").focus();
    expect(network.searchRequests).toHaveLength(1);
    // Tabbing from the field to its own search button does not search twice either.
    await search(page).fill("eiffel tower");
    await search(page).press("Tab");
    await expect(searchButton(page)).toBeFocused();
    expect(network.searchRequests).toHaveLength(1);
  });

  test("the map hint links the privacy page, which links the OpenStreetMap policy and comes back", async ({
    page,
  }) => {
    await openLanding(page);
    // The notice no longer takes a line of the landing: a link closes the hint line.
    await expect(page.getByText("which sees your IP address")).toHaveCount(0);
    await page.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page).toHaveURL(/#privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    await expect(page.getByText(/which sees your IP address/)).toBeVisible();
    await expect(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute(
      "href",
      "https://osmfoundation.org/wiki/Privacy_Policy",
    );
    await page.getByRole("link", { name: "Back to the start" }).click();
    await expect(page.getByRole("button", { name: /explore this sky/i })).toBeVisible();
  });

  test("typing after results closes the stale list without a request", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await search(page).fill("eiffel");
    await search(page).press("Enter");
    await expect(placeOptions(page)).toHaveCount(1);
    await search(page).pressSequentially(" tower");
    await expect(page.getByRole("listbox")).toBeHidden();
    expect(network.searchRequests).toHaveLength(1);
  });

  test("repeating the same search sends no second request", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await search(page).fill("Eiffel");
    await search(page).press("Enter");
    await expect(placeOptions(page)).toHaveCount(1);
    await search(page).fill("  eiffel ");
    await searchButton(page).click();
    await expect(placeOptions(page)).toHaveCount(1);
    expect(network.searchRequests).toHaveLength(1);
  });

  test("says so when nothing matches, and the page still works", async ({ page }) => {
    await stubSearch(page, []);
    await openLanding(page);
    await search(page).fill("zzzzzz");
    await search(page).press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "No place found for “zzzzzz”" })).toBeVisible();
  });

  test("a failing geocoder is announced politely and the coordinates take over", async ({ page }) => {
    await stubSearch(page, { status: 503 });
    await openLanding(page);
    await chooseMoment(page);
    await search(page).fill("paris");
    await searchButton(page).click();
    const status = page.getByRole("status").filter({ hasText: "Place search is unavailable right now." });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await coordinatesSwitch(page).click();
    await page.getByLabel("Latitude").fill("48.85");
    await page.getByLabel("Longitude").fill("2.35");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page)).toMatchObject({ lat: 48.85, lon: 2.35 });
  });

  test("Enter searches, with no pause", async ({ page, network }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await search(page).fill("Rio");
    await search(page).press("Enter");
    await expect(placeOptions(page)).toHaveCount(1);
    expect(network.searchRequests).toHaveLength(1);
  });
});

test.describe("coordinates", () => {
  test("the switch swaps the search for latitude and longitude, and back", async ({ page }) => {
    await openLanding(page);
    await mapReady(page);
    await coordinatesSwitch(page).click();
    await expect(coordinatesSwitch(page)).toHaveAttribute("aria-checked", "true");
    await expect(search(page)).toHaveCount(0);
    await expect(page.getByLabel("Latitude")).toBeVisible();
    await expect(mapRegion(page)).toBeVisible();
    await coordinatesSwitch(page).click();
    await expect(search(page)).toBeVisible();
    await expect(page.getByLabel("Latitude")).toHaveCount(0);
  });

  test("validate each field and move the place; Explore refuses bad input", async ({ page }) => {
    await openLanding(page);
    await chooseMoment(page);
    await coordinatesSwitch(page).click();
    await page.getByLabel("Latitude").fill("95");
    await expect(page.getByRole("alert")).toHaveText("Latitude must be a number between -90 and 90.");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    expect(new URL(page.url()).hash).not.toMatch(/^#(e|s|studio)=/);
    await page.getByLabel("Latitude").fill("-33.8688");
    await page.getByLabel("Longitude").fill("181");
    await expect(page.getByRole("alert")).toHaveText("Longitude must be a number between -180 and 180.");
    await page.getByLabel("Longitude").fill("151.2093");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".landing-selected")).toContainText("33.8688°S, 151.2093°E");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page)).toMatchObject({ lat: -33.8688, lon: 151.2093, place: null });
  });

  test("a typed pair brings the map there", async ({ page, network }) => {
    await openLanding(page);
    await mapReady(page);
    await coordinatesSwitch(page).click();
    await page.getByLabel("Latitude").fill("-33.8688");
    await page.getByLabel("Longitude").fill("151.2093");
    // Sydney at zoom 9 is in column 471.
    await expect.poll(() => network.tileRequests.some((url) => url.includes("/9/471/"))).toBe(true);
  });

  test("with the switch on, a click on the map updates the fields", async ({ page }) => {
    await openLanding(page);
    await mapReady(page);
    await coordinatesSwitch(page).click();
    const before = await page.getByLabel("Latitude").inputValue();
    await canvas(page).click({ position: { x: 120, y: 70 } });
    await expect(page.getByLabel("Latitude")).not.toHaveValue(before);
    await expect(page.locator(".landing-selected")).toContainText("Dropped pin");
  });
});

test.describe("the moment and the actions", () => {
  test("names an unknown timezone and an empty moment, and stays", async ({ page }) => {
    await openLanding(page);
    await page.getByLabel("Timezone", { exact: true }).fill("Mars/Olympus");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expect(page.getByRole("alert")).toContainText('Unknown timezone "Mars/Olympus"');
    await page.getByLabel("Timezone", { exact: true }).fill("UTC");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByLabel("Date and time").fill("");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expect(page.getByRole("alert")).toHaveText("Pick a date and time for the sky.");
    expect(new URL(page.url()).hash).not.toMatch(/^#(e|s|studio)=/);
  });

  test("Detect is a locate icon button and sets the browser's timezone", async ({ page }) => {
    await openLanding(page);
    const detect = page.getByRole("button", { name: "Detect my timezone" });
    await expect(detect).toHaveAttribute("title", "Detect my timezone");
    await expect(detect.locator("svg[data-icon=locate]")).toHaveCount(1);
    expect((await detect.innerText()).trim()).toBe("");
    await page.getByLabel("Timezone", { exact: true }).fill("Nowhere");
    await page.getByRole("button", { name: "Detect my timezone" }).click();
    const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    await expect(page.getByLabel("Timezone", { exact: true })).toHaveValue(zone);
  });

  test("the limiting magnitude from Advanced reaches the link", async ({ page }) => {
    await openLanding(page);
    await chooseMoment(page);
    await page.getByText("Advanced", { exact: true }).click();
    await page.getByLabel("Limiting magnitude").fill("4.5");
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page).mag).toBe(4.5);
  });

  test("the random sky link still opens a shared sky", async ({ page }) => {
    await openLanding(page);
    await page.getByRole("button", { name: "Load a random sky" }).click();
    await expect(page.getByRole("img", { name: /night sky poster/i })).toBeVisible();
    expect(new URL(page.url()).hash.startsWith("#s=")).toBe(true);
  });

  test("the keyboard alone gets from the search to the Explorer", async ({ page }) => {
    await stubSearch(page, [EIFFEL]);
    await openLanding(page);
    await chooseMoment(page);
    await search(page).focus();
    await page.keyboard.type("eiffel");
    await page.keyboard.press("Enter");
    await expect(placeOptions(page)).toHaveCount(1);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator(".landing-selected")).toContainText("Eiffel Tower");
    await page.getByRole("button", { name: "Explore this sky" }).focus();
    await page.keyboard.press("Enter");
    await expectExplorer(page);
  });
});

test.describe("one screen on a large display (FR-010)", () => {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`one column, and no page scroll at ${width.toString()}x${height.toString()} with Advanced closed`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openLanding(page);
      await mapReady(page);
      await expect(page.locator("details")).toHaveJSProperty("open", false);
      const sizes = await page.evaluate(() => ({
        page: document.documentElement.scrollHeight,
        viewport: window.innerHeight,
      }));
      expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
      // One column: the card is at most 45rem wide and the map takes its full width and grows into the spare height.
      const card = await page.locator(".landing-card").boundingBox();
      const map = await page.locator(".landing-map-box").boundingBox();
      expect(card?.width ?? 0).toBeLessThanOrEqual(724);
      expect(map?.width ?? 0).toBeGreaterThan((card?.width ?? 0) - 60);
      expect(map?.height ?? 0).toBeGreaterThanOrEqual(200);
      // The map takes the height the rest leaves, up to 60vh, and not a pixel into a scroll.
      expect(map?.height ?? 0).toBeLessThanOrEqual(height * 0.6 + 1);
      if (width === 1920) expect(map?.height ?? 0).toBeGreaterThan(300);
      // Advanced has a full-width row; Explore this sky is centred on the one below it.
      const advanced = await page.locator("details").boundingBox();
      const explore = await page.getByRole("button", { name: "Explore this sky" }).boundingBox();
      expect(advanced?.width ?? 0).toBeGreaterThan((card?.width ?? 0) - 60);
      expect((explore?.y ?? 0) >= (advanced?.y ?? 0) + (advanced?.height ?? 0) + 8).toBe(true);
      expect((explore?.x ?? 0) + (explore?.width ?? 0) / 2).toBeCloseTo((card?.x ?? 0) + (card?.width ?? 0) / 2, 0);
    });
  }

  test("a phone keeps Advanced above the action", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLanding(page);
    const advanced = await page.getByText("Advanced", { exact: true }).boundingBox();
    const explore = await page.getByRole("button", { name: "Explore this sky" }).boundingBox();
    expect((explore?.y ?? 0) > (advanced?.y ?? 0) + 20).toBe(true);
  });
});

test.describe("#c= creation link (FR-012)", () => {
  const CREATION = {
    place: null,
    lat: -12.5,
    lon: 130.25,
    when_local: "2026-06-01T22:00",
    tz: "Asia/Tokyo",
    title: "Our first flat",
    magnitude_limit: 4.5,
  };

  test("opens the landing pre-filled with the pin placed, and Explore carries the values", async ({ page, network }) => {
    await page.goto(`/#c=${encodeCreation(CREATION)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Where do you want to explore the sky from?" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Our first flat");
    await expect(page.getByLabel("Date and time")).toHaveValue("2026-06-01T22:00");
    await expect(page.getByLabel("Timezone", { exact: true })).toHaveValue("Asia/Tokyo");
    await expect(page.locator(".landing-selected")).toContainText("12.5000°S, 130.2500°E");
    await page.getByText("Advanced", { exact: true }).click();
    await expect(page.getByLabel("Limiting magnitude")).toHaveValue("4.5");
    // The pin is there: the map drew the tiles around it (zoom 9, Darwin's column).
    await mapReady(page);
    await expect.poll(() => network.tileRequests.some((url) => url.includes("/9/"))).toBe(true);
    expect(network.searchRequests).toEqual([]);
    await page.getByRole("button", { name: "Explore this sky" }).click();
    await expectExplorer(page);
    expect(hashPayload(page)).toMatchObject({
      lat: -12.5,
      lon: 130.25,
      place: null,
      tz: "Asia/Tokyo",
      when_utc: "2026-06-01T13:00:00Z",
      title: "Our first flat",
      mag: 4.5,
    });
  });

  test("a place in the link shows in the search field with no geocoder call", async ({ page, network }) => {
    await page.goto(`/#c=${encodeCreation({ ...CREATION, place: "Darwin, Australia" })}`);
    await expect(search(page)).toHaveValue("Darwin, Australia");
    await page.waitForLoadState("networkidle");
    expect(network.searchRequests).toEqual([]);
  });

  test("keeps the good fields when one is bad", async ({ page }) => {
    await page.goto(`/#c=${encodeCreation({ title: "Kept", tz: "Mars/Olympus" })}`);
    await expect(page.getByLabel("Title")).toHaveValue("Kept");
    await expect(page.getByLabel("Timezone", { exact: true })).not.toHaveValue("Mars/Olympus");
    await expect(page.getByText("That link could not be read")).toHaveCount(0);
  });

  test("an unreadable link leaves a blank form, says so politely and does not blank the page", async ({ page }) => {
    await page.goto("/#c=not-a-payload");
    const notice = page.getByRole("status").filter({ hasText: "That link could not be read, so the form is blank." });
    await expect(notice).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeVisible();
  });

  test("typing follows into #c= without adding history entries, and the link reopens the form", async ({ page }) => {
    await openLanding(page);
    expect(new URL(page.url()).hash).toBe("");
    const before = await page.evaluate(() => history.length);
    await page.getByLabel("Title").fill("Typed here");
    await page.getByLabel("Timezone", { exact: true }).fill("Europe/Lisbon");
    await expect.poll(() => new URL(page.url()).hash.startsWith("#c=")).toBe(true);
    await expect.poll(() => {
      const fragment = creationFragmentFromHash(new URL(page.url()).hash) ?? "";
      const decoded = decodeCreation(fragment);
      return decoded.status === "ok" ? [decoded.creation.title, decoded.creation.tz] : null;
    }).toEqual(["Typed here", "Europe/Lisbon"]);
    expect(await page.evaluate(() => history.length)).toBe(before);
    const link = page.url();
    await page.goto("about:blank");
    await page.goto(link);
    await expect(page.getByLabel("Title")).toHaveValue("Typed here");
    await expect(page.getByLabel("Timezone", { exact: true })).toHaveValue("Europe/Lisbon");
  });

  test("a pasted #c= link on the landing refills the form", async ({ page }) => {
    await openLanding(page);
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, `#c=${encodeCreation({ title: "Pasted" })}`);
    await expect(page.getByLabel("Title")).toHaveValue("Pasted");
  });

  test("there is no copy-link button: the address bar is the link", async ({ page }) => {
    await page.goto(`/#c=${encodeCreation(CREATION)}`);
    await expect(page.getByRole("button", { name: "Explore this sky" })).toBeVisible();
    await expect(page.getByRole("button", { name: /copy link/i })).toHaveCount(0);
  });

  test("#c= does not disturb the other links", async ({ page }) => {
    await page.goto("/#studio=not-a-draft");
    await expect(page.getByRole("link", { name: "Back to the start" })).toBeVisible();
    await page.goto("/#e=not-a-payload");
    await expect(page.getByRole("link", { name: "Back to the start" })).toBeVisible();
  });
});

test.describe("layout and accessibility", () => {
  for (const width of [360, 390]) {
    test(`does not scroll sideways at ${width.toString()} px, with every part open`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await stubSearch(page, [EIFFEL, TOKYO]);
      await openLanding(page);
      await mapReady(page);
      await page.getByText("Advanced", { exact: true }).click();
      await page.getByLabel("Title").fill("A fairly long title for a narrow phone screen to hold");
      await search(page).fill("tower");
      await searchButton(page).click();
      await expect(placeOptions(page)).toHaveCount(2);
      const overflow = await page.evaluate(() => {
        const w = window.innerWidth;
        const out: string[] = [];
        if ((document.scrollingElement?.scrollWidth ?? 0) > w) out.push("page scrolls sideways");
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          // Tiles run past the map's edge and are clipped by it, as they should be.
          if (el.closest(".leaflet-container") && !el.classList.contains("leaflet-container")) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > w + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed") {
            out.push(`${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`);
          }
        }
        return out.slice(0, 5);
      });
      expect(overflow).toEqual([]);
    });
  }

  test("has no serious or critical axe violations, closed and with everything open", async ({ page }) => {
    await stubSearch(page, [EIFFEL, TOKYO]);
    await openLanding(page);
    const analyze = () => new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(["color-contrast"]).analyze();
    const blocking = async (): Promise<string> =>
      (await analyze()).violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id}: ${v.help}`)
        .join("\n");
    expect(await blocking()).toBe("");
    await mapReady(page);
    await page.getByText("Advanced", { exact: true }).click();
    await search(page).fill("tower");
    await searchButton(page).click();
    await expect(placeOptions(page)).toHaveCount(2);
    expect(await blocking()).toBe("");
    await search(page).press("Escape");
    await coordinatesSwitch(page).click();
    await page.getByLabel("Latitude").fill("95");
    await page.getByLabel("Title").fill("Night 🌌");
    expect(await blocking()).toBe("");
  });
});
