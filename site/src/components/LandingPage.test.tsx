import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: LandingPage } = await import("./LandingPage.tsx");

afterEach(() => {
  cleanup();
});

describe("LandingPage structure (013)", () => {
  it("asks where to explore from, with a search field", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Where do you want to explore the sky from?" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: "Search for a place" })).toBeDefined();
  });

  it("starts with the map closed and the coordinates collapsed", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: "Show map" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Coordinates" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: "Map for choosing a place" })).toBeNull();
  });

  it("names the chosen place and its coordinates from the start", () => {
    render(<LandingPage />);
    expect(screen.getByText("Exploring from")).toBeDefined();
    expect(document.body.textContent).toContain("40.7580°N, 73.9855°W");
  });

  it("opens the coordinates and keeps them in step with the place", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-12.5" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "130.25" } });
    expect(document.body.textContent).toContain("Typed coordinates");
    expect(document.body.textContent).toContain("12.5000°S, 130.2500°E");
  });

  it("flags out-of-range coordinates without losing the page", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "95" } });
    expect(screen.getByRole("alert").textContent).toBe("Latitude must be a number between -90 and 90.");
    expect(screen.getByRole("combobox", { name: "Search for a place" })).toBeDefined();
  });

  it("puts date and time and the timezone with Detect in one pair", () => {
    render(<LandingPage />);
    const pair = document.getElementById("landing-when")?.closest(".atlas-form-pair");
    expect(pair?.querySelector("#landing-tz")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Detect" })).toBeDefined();
  });

  it("starts at the current moment in the detected zone", () => {
    render(<LandingPage />);
    const when = screen.getByLabelText<HTMLInputElement>("Date and time").value;
    expect(when).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(screen.getByLabelText<HTMLInputElement>("Timezone").value).not.toBe("");
  });

  it("offers one Advanced disclosure holding the limiting magnitude, and no poster options", () => {
    render(<LandingPage />);
    const summaries = [...document.querySelectorAll("details > summary")].map((e) => e.textContent);
    expect(summaries).toEqual(["Advanced"]);
    for (const id of ["landing-projection", "landing-fisheye", "landing-separation", "landing-glow", "landing-title"]) {
      expect(document.getElementById(id), id).toBeNull();
    }
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText("Appearance")).toBeNull();
    expect(document.getElementById("landing-mag")).not.toBeNull();
  });

  it("keeps the random-sky link and has no explainer", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: "Load a random sky" })).toBeDefined();
    expect(screen.queryByText("What is this page?")).toBeNull();
  });
});
