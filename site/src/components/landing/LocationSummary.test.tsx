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
  it("is one line: the name, a bullet and the coordinates, with the label above", () => {
    render(<LocationSummary location={{ lat: 48.8584, lon: 2.2945, place: "Eiffel Tower, Paris", source: "search" }} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Exploring from");
    // The label is for screen readers only.
    expect(status.querySelector(".sr-only")?.textContent).toBe("Exploring from");
    const line = status.querySelector(".landing-selected-line");
    expect(line?.querySelector(".landing-selected-name")?.textContent).toBe("Eiffel Tower, Paris");
    // The bullet trails the place (with a no-break space), so it can never lead a wrapped line.
    const lead = line?.querySelector(".landing-selected-lead");
    expect(lead?.textContent).toBe("Eiffel Tower, Paris\u00a0•");
    expect(lead?.querySelector("[aria-hidden=true]")?.textContent).toBe("\u00a0•");
    expect(line?.querySelector(".landing-selected-coords:not([aria-hidden])")?.textContent).toBe("48.8584°N, 2.2945°E");
  });

  it("reads naturally to a screen reader: the bullet is hidden and a comma stands in", () => {
    render(<LocationSummary location={{ lat: 1, lon: 2, place: "Paris", source: "search" }} />);
    const line = document.querySelector(".landing-selected-line");
    expect(line?.querySelector(".sr-only")?.textContent).toBe(", ");
    expect(line?.textContent).toContain("Paris");
    expect(document.querySelector("[aria-hidden=true]")?.textContent).toBe("\u00a0•");
  });

  it("shows the coordinates alone, with no bullet, for a dropped pin, and names it for screen readers", () => {
    render(<LocationSummary location={{ lat: -33.8688, lon: 151.2093, place: null, source: "pin" }} />);
    const line = document.querySelector(".landing-selected-line");
    expect(line?.querySelector(".landing-selected-name")).toBeNull();
    expect(line?.querySelector("[aria-hidden=true]")).toBeNull();
    expect(line?.querySelector(".landing-selected-coords")?.textContent).toBe("33.8688°S, 151.2093°E");
    expect(line?.querySelector(".sr-only")?.textContent).toBe("Dropped pin, ");
  });

  it("calls typed coordinates what they are, for screen readers", () => {
    render(<LocationSummary location={{ lat: 1, lon: 2, place: null, source: "typed" }} />);
    expect(document.querySelector(".landing-selected-line .sr-only")?.textContent).toBe("Typed coordinates, ");
  });
});
