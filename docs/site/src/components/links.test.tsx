/**
 * Public links stay under the Vite base no matter the page URL: a relative
 * "./…" href escapes to the host root when the URL lacks a trailing slash.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost/" });

process.env["BASE_URL"] = "/starsky/";
// Mirror the Vite `define` from vite.config.ts — bun:test runs unbundled.
(globalThis as Record<string, unknown>)["__DOCS_VERSION__"] = "test";

const { cleanup, render, screen, within } = await import("@testing-library/react");
const { default: App } = await import("../App.tsx");

afterEach(() => {
  cleanup();
});

describe("public links", () => {
  it("points the footer llms.txt under the base, not the host root", () => {
    render(<App />);
    const footer = screen.getByRole("contentinfo");
    const link = within(footer).getByRole("link", { name: "llms.txt" });
    expect(link.getAttribute("href")).toBe("/starsky/llms.txt");
  });

  it("points per-page Markdown alternates under the base", () => {
    render(<App />);
    const md = screen.getByRole("link", { name: "Read as Markdown" });
    const href = md.getAttribute("href") ?? "";
    expect(href.startsWith("/starsky/docs/en/")).toBe(true);
    expect(href.endsWith(".md")).toBe(true);
  });
});
