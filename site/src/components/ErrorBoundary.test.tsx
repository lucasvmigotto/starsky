import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, render, screen } = await import("@testing-library/react");
const { default: ErrorBoundary } = await import("./ErrorBoundary.tsx");

afterEach(() => {
  cleanup();
});

function Boom({ fail }: { fail: boolean }) {
  if (fail) throw new Error("chunk did not load");
  return <p>fine</p>;
}

describe("ErrorBoundary", () => {
  it("shows an alert with a way forward instead of an empty page", () => {
    const log = spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary resetKey="a">
        <Boom fail />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain("This page could not be loaded");
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the start" }).getAttribute("href")).toBe("#/");
    log.mockRestore();
  });

  it("tries its children again when the reset key changes", () => {
    const log = spyOn(console, "error").mockImplementation(() => undefined);
    const view = render(
      <ErrorBoundary resetKey="a">
        <Boom fail />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole("alert")).not.toBeNull();
    view.rerender(
      <ErrorBoundary resetKey="b">
        <Boom fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("fine")).toBeTruthy();
    log.mockRestore();
  });
});
