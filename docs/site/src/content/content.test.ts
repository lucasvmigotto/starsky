/**
 * Content integrity: every page renders in both locales, routes are unique,
 * and maturity is explicit everywhere it matters.
 */
import { describe, expect, it } from "bun:test";
import { contentOf, homePage, pages, slug, type Page } from "./pages.ts";
import { pageMarkdown } from "../../scripts/generate_llms.ts";

function byId(id: string): Page {
  const found = pages.find((p) => p.id === id);
  if (!found) throw new Error(`page missing from registry: ${id}`);
  return found;
}

describe("content", () => {
  it("has a home page at /", () => {
    expect(homePage.route).toBe("/");
    expect(slug(homePage)).toBe("index");
  });

  it("uses unique routes and slugs", () => {
    const routes = pages.map((p) => p.route);
    expect(new Set(routes).size).toBe(pages.length);
    const slugs = pages.map(slug);
    expect(new Set(slugs).size).toBe(pages.length);
  });

  it("renders every page in both locales with real content", () => {
    for (const page of pages) {
      for (const locale of ["en", "pt"] as const) {
        const content = contentOf(page, locale);
        expect(content.title.length).toBeGreaterThan(0);
        expect(content.summary.length).toBeGreaterThan(20);
        expect(content.sections.length).toBeGreaterThan(0);
        for (const section of content.sections) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.paragraphs.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps both locales structurally aligned", () => {
    for (const page of pages) {
      expect(page.pt.sections.length).toBe(page.en.sections.length);
    }
  });

  it("labels non-Implemented pages inline in the Markdown", () => {
    // An LLM reading the .md never sees a badge.
    for (const page of pages) {
      for (const locale of ["en", "pt"] as const) {
        const md = pageMarkdown(locale, page);
        if (page.maturity !== "Implemented") {
          const marker =
            page.maturity === "Partial"
              ? locale === "pt"
                ? "Parcialmente"
                : "Partially"
              : locale === "pt"
                ? "Planejado"
                : "Planned";
          expect(md).toContain(marker);
        }
      }
    }
  });

  it("emits code fences with language tags and Markdown tables", () => {
    const md = pageMarkdown("en", byId("install"));
    expect(md).toContain("```bash");
    const concepts = pageMarkdown("en", byId("concepts"));
    expect(concepts).toContain("| Term |");
  });
});
