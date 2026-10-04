/**
 * llms output: every page has its .md in every locale, every llms.txt link
 * resolves to a generated file, and llms-full.txt contains every page.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { contentOf, pages, slug } from "../src/content/pages.ts";
import { llmsFull, llmsTxt } from "./generate_llms.ts";

const dist = join(import.meta.dirname, "..", "dist");

describe("llms output", () => {
  it("links every page in every locale from llms.txt", () => {
    const txt = llmsTxt();
    for (const page of pages) {
      for (const locale of ["en", "pt"] as const) {
        expect(txt).toContain(`docs/${locale}/${slug(page)}.md`);
      }
      expect(txt).toContain(page.en.title);
    }
    expect(txt).toContain("## Optional");
    expect(txt).toContain("llms-full.txt");
  });

  it("concatenates every page in llms-full.txt", () => {
    const full = llmsFull();
    for (const page of pages) {
      expect(full).toContain(contentOf(page, "en").title);
      expect(full).toContain(contentOf(page, "pt").title);
    }
  });

  it("writes every linked file to dist (run bun run build first)", () => {
    for (const page of pages) {
      for (const locale of ["en", "pt"] as const) {
        const file = join(dist, "docs", locale, `${slug(page)}.md`);
        expect(existsSync(file), file).toBe(true);
        expect(readFileSync(file, "utf-8")).toContain(
          contentOf(page, locale).title,
        );
      }
    }
    for (const name of ["llms.txt", "llms-full.txt"]) {
      expect(existsSync(join(dist, name)), name).toBe(true);
    }
  });
});
