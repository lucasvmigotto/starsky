import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** FR-001: the sky domain is pure; no React, DOM, Canvas, or poster modules beyond three. */

const DIR = new URL(".", import.meta.url).pathname;
const SOURCES = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

const ALLOWED_SIBLINGS = new Set(["../astro.ts", "../encode.ts", "../share.ts"]);
const FORBIDDEN_GLOBALS = [
  "document",
  "window",
  "CanvasRenderingContext2D",
  "HTMLCanvasElement",
  "OffscreenCanvas",
  "requestAnimationFrame",
];

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function importsOf(code: string): { spec: string; typeOnly: boolean }[] {
  const found: { spec: string; typeOnly: boolean }[] = [];
  const re = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?[^"';]*?from\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of code.matchAll(re)) {
    const spec = m.slice(1).find((part) => part);
    if (spec) found.push({ spec, typeOnly: /^\s*(?:import|export)\s+type\s/.test(m[0]) });
  }
  return found;
}

describe("sky domain purity", () => {
  it("finds the module files", () => {
    expect(SOURCES.length).toBeGreaterThanOrEqual(6);
  });

  for (const file of SOURCES) {
    const code = stripComments(readFileSync(join(DIR, file), "utf8"));

    it(`${file} imports no React and only allowed poster modules`, () => {
      for (const { spec, typeOnly } of importsOf(code)) {
        expect(/^react(-dom)?(\/|$)/.test(spec)).toBe(false);
        if (spec.startsWith("./")) continue;
        if (spec === "pako") continue;
        if (spec === "../skymodel.ts") {
          // Only the StarRow / SegmentRow types may come from the poster model.
          expect(typeOnly).toBe(true);
          continue;
        }
        expect(ALLOWED_SIBLINGS.has(spec)).toBe(true);
      }
    });

    it(`${file} uses no DOM or Canvas globals`, () => {
      for (const name of FORBIDDEN_GLOBALS) {
        expect(new RegExp(`\\b${name}\\b`).test(code)).toBe(false);
      }
    });
  }

  it("the scanner sees real imports", () => {
    const code = stripComments(readFileSync(join(DIR, "payload.ts"), "utf8"));
    const specs = importsOf(code).map((i) => i.spec);
    expect(specs).toContain("pako");
    expect(specs).toContain("../share.ts");
  });

  it("the import scanner itself catches violations", () => {
    const bad = `import { useState } from "react";\nimport { x } from "../view.ts";\nimport type { StarRow } from "../skymodel.ts";`;
    const specs = importsOf(bad);
    expect(specs.map((s) => s.spec)).toEqual(["react", "../view.ts", "../skymodel.ts"]);
    expect(specs[2]?.typeOnly).toBe(true);
    expect(specs[1]?.typeOnly).toBe(false);
    expect(/\bwindow\b/.test(stripComments("const w = window.innerWidth;"))).toBe(true);
  });
});
