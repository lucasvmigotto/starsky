import type { Page, PageContent } from "./types.ts";

export type { Page } from "./types.ts";
import {
  architectureEn,
  cliEn,
  conceptsEn,
  deliveryEn,
  installEn,
  overviewEn,
  roadmapEn,
  viewerEn,
} from "./en.ts";
import {
  architecturePt,
  cliPt,
  conceptsPt,
  deliveryPt,
  installPt,
  overviewPt,
  roadmapPt,
  viewerPt,
} from "./pt.ts";

function pair(
  id: string,
  route: string,
  maturity: Page["maturity"],
  maturityNote: string,
  en: PageContent,
  pt: PageContent,
): Page {
  return { id, route, maturity, maturityNote, en, pt };
}

/** Navigation order. The generator and the sitemap share this list. */
export const pages: Page[] = [
  pair("/", "/", "Implemented", "", overviewEn, overviewPt),
  pair("install", "/install", "Implemented", "", installEn, installPt),
  pair("cli", "/cli", "Implemented", "", cliEn, cliPt),
  pair("viewer", "/viewer", "Implemented", "", viewerEn, viewerPt),
  pair("concepts", "/concepts", "Implemented", "", conceptsEn, conceptsPt),
  pair(
    "architecture",
    "/architecture",
    "Implemented",
    "",
    architectureEn,
    architecturePt,
  ),
  pair(
    "delivery",
    "/delivery",
    "Partial",
    "Deploy path unverified: the R2 token lacks ListObjects scope.",
    deliveryEn,
    deliveryPt,
  ),
  pair(
    "roadmap",
    "/roadmap",
    "Implemented",
    "The page is complete; the items it lists carry their own Planned labels.",
    roadmapEn,
    roadmapPt,
  ),
];

export type Locale = "en" | "pt";

/** URL slug for a page: the home page is `index`, the rest use their id. */
export function slug(page: Page): string {
  return page.id === "/" ? "index" : page.id;
}

const home = pages[0];
if (home === undefined) {
  throw new Error("Home page (/) is missing from the page list");
}
export const homePage: Page = home;

export function contentOf(page: Page, locale: Locale): PageContent {
  return locale === "pt" ? page.pt : page.en;
}
