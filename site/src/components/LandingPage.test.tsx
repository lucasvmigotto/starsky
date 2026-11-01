import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

(globalThis as unknown as Record<string, unknown>)["__APP_VERSION__"] = "9.8.7";

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: LandingPage } = await import("./LandingPage.tsx");
const { decodeExplorer } = await import("../lib/sky/payload.ts");
const { decodeDraft } = await import("../lib/studio/draft.ts");

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

/** Fill the moment so the result does not depend on the clock or the machine's zone. */
function fixMoment(): void {
  fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-01-01T00:00" } });
  fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "America/New_York" } });
}

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

describe("LandingPage actions (013)", () => {
  it("Explore this sky opens a #e= link with the place, moment and magnitude", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(window.location.hash.startsWith("#e=")).toBe(true);
    const payload = decodeExplorer(window.location.hash.slice(3));
    expect(payload).toMatchObject({
      lat: 40.758,
      lon: -73.9855,
      place: "Times Square, New York, NY",
      tz: "America/New_York",
      when_utc: "2026-01-01T05:00:00Z",
      mag: 5.8,
      title: null,
      sel: null,
    });
  });

  it("carries a dropped pin's coordinates with no place name", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.click(screen.getByRole("button", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-33.8688" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "151.2093" } });
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    const payload = decodeExplorer(window.location.hash.slice(3));
    expect(payload.place).toBeNull();
    expect(payload.lat).toBe(-33.8688);
    expect(payload.lon).toBe(151.2093);
  });

  it("carries the limiting magnitude from Advanced", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.change(screen.getByLabelText("Limiting magnitude"), { target: { value: "4.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(decodeExplorer(window.location.hash.slice(3)).mag).toBe(4.5);
  });

  it("Make a poster instead opens a #studio= draft of the same scene with the default composition", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.click(screen.getByRole("button", { name: "Make a poster instead" }));
    expect(window.location.hash.startsWith("#studio=")).toBe(true);
    const poster = decodeDraft(window.location.hash.slice("#studio=".length));
    expect(poster).toMatchObject({ lat: 40.758, lon: -73.9855, tz: "America/New_York", when_utc: "2026-01-01T05:00:00Z" });
    expect(poster.options).toMatchObject({ projection: "stereographic", shape: "circle", title: null });
  });

  it("names an unknown timezone and stays on the page", () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-01-01T00:00" } });
    fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "Mars/Olympus" } });
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(screen.getByRole("alert").textContent).toContain("Unknown timezone \"Mars/Olympus\"");
    expect(window.location.hash).toBe("");
  });

  it("asks for a moment when the field is empty", () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Make a poster instead" }));
    expect(screen.getByRole("alert").textContent).toBe("Pick a date and time for the sky.");
    expect(window.location.hash).toBe("");
  });

  it("does not leave while the coordinates are invalid, and shows them", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.click(screen.getByRole("button", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "95" } });
    fireEvent.click(screen.getByRole("button", { name: "Coordinates" }));
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(window.location.hash).toBe("");
    expect(screen.getByRole("button", { name: "Coordinates" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Latitude must be a number between -90 and 90.");
  });

  it("clears the error once the field is fixed", () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(screen.getByRole("alert")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-01-01T00:00" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("LandingPage identity (013, 015)", () => {
  it("carries the site header and the footer with the version link", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: "Starsky" }).getAttribute("href")).toBe("#/");
    expect(screen.getByRole("link", { name: "starsky@v9.8.7" })).toBeDefined();
    expect(document.querySelector("main")).not.toBeNull();
  });
});
