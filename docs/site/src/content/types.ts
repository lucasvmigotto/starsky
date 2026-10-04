/**
 * Typed documentation content. One `Page` per route; every page carries the
 * same shape in `en` and `pt`, so a missing translation is a type error,
 * never a silent gap. The Markdown/llms.txt generator renders from these
 * same objects — never a second hand-maintained copy.
 */

export type Maturity = "Implemented" | "Partial" | "Planned" | "N/A";

export interface CodeSample {
  lang: string;
  text: string;
}

export interface DocTable {
  head: string[];
  rows: string[][];
}

export interface DocSection {
  heading: string;
  paragraphs: string[];
  code?: CodeSample[];
  table?: DocTable;
}

export interface PageContent {
  title: string;
  summary: string;
  sections: DocSection[];
}

export interface Page {
  id: string;
  route: string;
  maturity: Maturity;
  maturityNote: string;
  en: PageContent;
  pt: PageContent;
}
