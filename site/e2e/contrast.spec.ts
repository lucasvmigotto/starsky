/**
 * Contrast check (constitution VI: WCAG 2.2 AA).
 *
 * Replaces axe's `color-contrast` rule, which cannot resolve Tailwind v4's
 * `color-mix(in oklab, …)` opacity utilities on this Chromium build: it reports
 * `#48494d` where the computed colour is `rgb(245,239,224)` — 30 false
 * positives on a page whose real ratios are above 16:1 (see `a11y.spec.ts`).
 *
 * This computes the ratio from the **resolved** values instead: it reads the
 * computed colour, composites it over the first opaque ancestor background, and
 * applies the WCAG relative-luminance formula. Disabling axe's rule without
 * this replacement would hide genuine regressions.
 */
import { expect, fragmentFor, test, viewerUrl } from "./fixtures.ts";

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number): number => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

interface Sample {
  selector: string;
  fontSizePx: number;
  bold: boolean;
  fg: [number, number, number];
  bg: [number, number, number];
}

/** Read resolved foreground/background pairs for the named selectors. */
async function sample(
  page: import("@playwright/test").Page,
  selectors: string[],
): Promise<Sample[]> {
  return page.evaluate((list: string[]) => {
    // The browser resolves `oklab()`/`color-mix()` for us: painting the colour
    // onto a 1x1 canvas and reading the pixel back gives sRGB. Parsing the CSS
    // string directly fails on Tailwind v4's oklab output.
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const toRgb = (
      css: string,
      over: [number, number, number],
    ): { rgb: [number, number, number]; alpha: number } => {
      if (!ctx) return { rgb: over, alpha: 0 };
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = `rgb(${over.join(",")})`;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return {
        rgb: [data[0], data[1], data[2]],
        alpha: data[3] / 255,
      };
    };

    const results: Sample[] = [];
    for (const selector of list) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const style = getComputedStyle(el);
      // Walk up for the nearest opaque-ish background, compositing as we go.
      let node: Element | null = el;
      let bg: [number, number, number] = [11, 15, 25];
      let bgAlpha = 0;
      while (node && bgAlpha < 0.999) {
        const bgCss = getComputedStyle(node).backgroundColor;
        const resolved = toRgb(bgCss, bg);
        if (resolved.alpha > 0) {
          bg = resolved.rgb;
          bgAlpha = resolved.alpha + bgAlpha * (1 - resolved.alpha);
        }
        node = node.parentElement;
      }
      // Composite the (possibly translucent) text colour over that background.
      const fgResolved = toRgb(style.color, bg);
      results.push({
        selector,
        fontSizePx: Number.parseFloat(style.fontSize),
        bold: Number.parseInt(style.fontWeight, 10) >= 700,
        fg: fgResolved.rgb,
        bg,
      });
    }
    return results;
  }, selectors);
}

const VIEWER_TEXT = [
  "h2",
  ".text-cream\\/60",
  ".atlas-figure span:first-child",
  ".atlas-figure span:last-child",
];

test.describe("contrast (WCAG 2.2 AA)", () => {
  test("viewer text meets 4.5:1", async ({ page }) => {
    await page.goto(viewerUrl(fragmentFor()));
    await expect(
      page.getByRole("img", { name: /night sky poster/i }),
    ).toBeVisible();

    const samples = await sample(page, VIEWER_TEXT);
    // The selectors must actually resolve, or this test proves nothing.
    expect(samples.length).toBeGreaterThanOrEqual(3);

    const failures: string[] = [];
    for (const s of samples) {
      const ratio = contrast(s.fg, s.bg);
      // Large text (>= 24px, or >= 18.66px bold) needs 3:1; everything else 4.5:1.
      const large = s.fontSizePx >= 24 || (s.bold && s.fontSizePx >= 18.66);
      const required = large ? 3 : 4.5;
      if (ratio < required) {
        failures.push(
          `${s.selector}: ${ratio.toFixed(2)}:1 (needs ${required.toString()}:1)`,
        );
      }
    }
    expect(failures.join("\n")).toBe("");
  });

  test("landing form text meets 4.5:1", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /show my sky/i })).toBeVisible();

    const samples = await sample(page, [
      "label[for='landing-lat']",
      ".atlas-form-hint",
    ]);
    expect(samples.length).toBeGreaterThanOrEqual(1);

    const failures: string[] = [];
    for (const s of samples) {
      const ratio = contrast(s.fg, s.bg);
      const large = s.fontSizePx >= 24 || (s.bold && s.fontSizePx >= 18.66);
      const required = large ? 3 : 4.5;
      if (ratio < required) {
        failures.push(
          `${s.selector}: ${ratio.toFixed(2)}:1 (needs ${required.toString()}:1)`,
        );
      }
    }
    expect(failures.join("\n")).toBe("");
  });
});
