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

  it("keeps the attribution below the link", () => {
    render(<SiteFooter />);
    const metas = [...document.querySelectorAll(".atlas-footer-meta")];
    expect(metas).toHaveLength(2);
    expect(metas[0]?.textContent).toBe("starsky@v9.8.7");
    expect(metas[1]?.textContent).toContain("Stellarium");
    expect(metas[1]?.textContent).toContain("OpenStreetMap");
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
