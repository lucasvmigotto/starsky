import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, render, screen } = await import("@testing-library/react");
const { default: LocationSummary } = await import("./LocationSummary.tsx");

afterEach(() => {
  cleanup();
});

describe("LocationSummary", () => {
  it("shows a searched place by name with its coordinates", () => {
    render(<LocationSummary location={{ lat: 48.8584, lon: 2.2945, place: "Eiffel Tower, Paris", source: "search" }} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Exploring from");
    expect(status.textContent).toContain("Eiffel Tower, Paris");
    expect(status.textContent).toContain("48.8584°N, 2.2945°E");
  });

  it("calls a dropped pin 'Dropped pin' and formats its coordinates", () => {
    render(<LocationSummary location={{ lat: -33.8688, lon: 151.2093, place: null, source: "pin" }} />);
    expect(screen.getByRole("status").textContent).toContain("Dropped pin");
    expect(screen.getByRole("status").textContent).toContain("33.8688°S, 151.2093°E");
  });

  it("calls typed coordinates what they are", () => {
    render(<LocationSummary location={{ lat: 1, lon: 2, place: null, source: "typed" }} />);
    expect(screen.getByRole("status").textContent).toContain("Typed coordinates");
  });
});
