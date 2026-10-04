/**
 * Phase 4b — LLM-readable output, generated from the same typed content
 * the pages render. Never a second hand-maintained copy.
 *
 * Emits into dist/ (run after `vite build` via `bun run build`):
 * - llms.txt — title, summary, per-page links, Optional section
 * - llms-full.txt — every page concatenated in navigation order
 * - docs/<locale>/<id>.md — one Markdown file per page and locale,
 *   served as text/markdown, advertised via rel=alternate
 *
 * Maturity labels appear inline in the Markdown: an LLM never sees a badge.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentOf,
  pages,
  slug,
  type Locale,
  type Page,
} from "../src/content/pages.ts";
import type { DocSection } from "../src/content/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");
const base =
  process.env["DOCS_PUBLIC_URL"] ?? "https://docs.lucasvmigotto.me/starsky/";

function mdUrl(locale: Locale, page: Page): string {
  return `${base}docs/${locale}/${slug(page)}.md`;
}

function maturityLine(locale: Locale, page: Page): string {
  if (page.maturity === "Implemented") return "";
  const label =
    locale === "pt"
      ? {
          Partial: "Parcialmente implementado — ainda não verificado em produção.",
          Planned: "Planejado — ainda não implementado.",
          "N/A": "Não aplicável.",
        }[page.maturity]
      : {
          Partial: "Partially implemented — not yet verified in production.",
          Planned: "Planned — not implemented yet.",
          "N/A": "Not applicable.",
        }[page.maturity];
  const extra = page.maturityNote !== "" ? ` ${page.maturityNote}` : "";
  return `\n\n**${label}**${extra}\n`;
}

function sectionMarkdown(section: DocSection): string {
  const parts: string[] = [`## ${section.heading}\n`];
  for (const paragraph of section.paragraphs) {
    parts.push(`${paragraph}\n`);
  }
  if (section.table) {
    const head = `| ${section.table.head.join(" | ")} |`;
    const rule = `| ${section.table.head.map(() => "---").join(" | ")} |`;
    const rows = section.table.rows.map((r) => `| ${r.join(" | ")} |`);
    parts.push([head, rule, ...rows].join("\n") + "\n");
  }
  for (const sample of section.code ?? []) {
    parts.push(`\`\`\`${sample.lang}\n${sample.text}\n\`\`\`\n`);
  }
  return parts.join("\n");
}

export function pageMarkdown(locale: Locale, page: Page): string {
  const content = contentOf(page, locale);
  const parts: string[] = [
    `# ${content.title}\n`,
    `> ${content.summary}\n`,
    maturityLine(locale, page),
  ];
  for (const section of content.sections) {
    parts.push(sectionMarkdown(section));
  }
  return parts.join("\n");
}

export function llmsTxt(): string {
  const lines: string[] = [
    "# starsky docs\n",
    "> Static, client-only night-sky poster studio: install, CLI reference, viewer guide, concepts, architecture, delivery, roadmap.\n",
    "## Pages\n",
  ];
  for (const page of pages) {
    lines.push(`- [${page.en.title}](${mdUrl("en", page)}): ${page.en.summary}`);
  }
  lines.push("\n## Português\n");
  for (const page of pages) {
    lines.push(`- [${page.pt.title}](${mdUrl("pt", page)}): ${page.pt.summary}`);
  }
  lines.push(
    "\n## Optional\n",
    `- [llms-full.txt](${base}llms-full.txt): every page concatenated in navigation order. Skip when reading per-page files.`,
  );
  return lines.join("\n") + "\n";
}

export function llmsFull(): string {
  const parts: string[] = [`# starsky docs (full)\n`];
  for (const page of pages) {
    parts.push(`\n---\n\n ([#${page.id} en](${mdUrl("en", page)}))\n`);
    parts.push(pageMarkdown("en", page));
    parts.push(`\n([#${page.id} pt](${mdUrl("pt", page)}))\n`);
    parts.push(pageMarkdown("pt", page));
  }
  return parts.join("\n");
}

function main(): void {
  for (const locale of ["en", "pt"] as const) {
    for (const page of pages) {
      const out = join(dist, "docs", locale, `${slug(page)}.md`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, pageMarkdown(locale, page), "utf-8");
    }
  }
  writeFileSync(join(dist, "llms.txt"), llmsTxt(), "utf-8");
  writeFileSync(join(dist, "llms-full.txt"), llmsFull(), "utf-8");
  console.log(
    `llms output: ${String(pages.length * 2)} page files + llms.txt + llms-full.txt`,
  );
}

main();
