import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}
(globalThis as unknown as Record<string, unknown>)["__APP_VERSION__"] = "9.8.7";

const { cleanup, render, screen } = await import("@testing-library/react");
const { default: SiteFooter } = await import("./SiteFooter.tsx");

afterEach(() => {
  cleanup();
});

describe("SiteFooter (FR-011)", () => {
  it("reads starsky@v<version> as one link to the source, with no separate source link", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", { name: "starsky@v9.8.7" });
    expect(link.getAttribute("href")).toBe("https://github.com/lucasvmigotto/starsky");
    expect(screen.queryByRole("link", { name: "source" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("puts the credits on the left and the version link at the end", () => {
    render(<SiteFooter />);
    const info = document.querySelector(".atlas-footer-info");
    const end = document.querySelector(".atlas-footer-end");
    expect(info?.textContent).toContain("Stellarium");
    expect(info?.textContent).toContain("OpenStreetMap");
    expect(info?.querySelector("a")).toBeNull();
    expect(end?.querySelector(".atlas-footer-version a")?.textContent).toBe("starsky@v9.8.7");
    expect(info?.compareDocumentPosition(end as Node) ?? 0).toBe(4);
  });

  it("puts the tagline right before the version link, in one group, and only the version is a link", () => {
    render(<SiteFooter />);
    const group = document.querySelector(".atlas-footer-version");
    expect(group?.textContent).toBe("Drawn from 8 000+ stars, in your browser · starsky@v9.8.7");
    expect(group?.querySelectorAll("a")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("puts the actions just before the version link in the keyboard order", () => {
    render(
      <SiteFooter>
        <button type="button" aria-label="Thing" />
      </SiteFooter>,
    );
    const end = document.querySelector(".atlas-footer-end");
    expect([...(end?.children ?? [])].map((c) => c.className)).toEqual([
      "atlas-footer-actions",
      "atlas-footer-meta atlas-footer-version",
    ]);
  });

  it("shows page actions on the right when given, and nothing when not", () => {
    const { rerender } = render(<SiteFooter />);
    expect(document.querySelector(".atlas-footer-actions")).toBeNull();
    rerender(
      <SiteFooter>
        <button type="button" aria-label="Thing" />
      </SiteFooter>,
    );
    expect(document.querySelector(".atlas-footer-actions")?.querySelector("button")).not.toBeNull();
  });
});
