import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

(globalThis as unknown as Record<string, unknown>)["__APP_VERSION__"] = "9.8.7";

const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const { encodeCreation, decodeCreation } = await import("../lib/landing/creation.ts");
const { default: LandingPage } = await import("./LandingPage.tsx");
const { decodeExplorer } = await import("../lib/sky/payload.ts");

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

  it("shows the map at once, under the search, with a Coordinates switch beside it", () => {
    render(<LandingPage />);
    expect(screen.getByRole("region", { name: "Map for choosing a place" })).toBeDefined();
    const sw = screen.getByRole("switch", { name: "Coordinates" });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    const row = sw.closest(".landing-place-row");
    expect(row?.querySelector("[role=combobox]")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /show map|hide map|expand map|skip the map/i })).toBeNull();
    expect(screen.queryByLabelText("Latitude")).toBeNull();
  });

  it("shows the map hint and the search credit on one line, then the summary, below the row", () => {
    render(<LandingPage />);
    const text = document.querySelector(".landing-card")?.textContent ?? "";
    const order = ["Search for a place", "Click or drag the pin", "Search by Nominatim", "Exploring from"].map((m) => text.indexOf(m));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });

  it("names the chosen place and its coordinates from the start", () => {
    render(<LandingPage />);
    expect(screen.getByText("Exploring from")).toBeDefined();
    expect(document.body.textContent).toContain("40.7580°N, 73.9855°W");
  });

  it("the switch replaces the search with latitude and longitude, and back", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
    expect(screen.queryByRole("combobox", { name: "Search for a place" })).toBeNull();
    expect(screen.getByLabelText("Latitude")).toBeDefined();
    expect(screen.getByRole("region", { name: "Map for choosing a place" })).toBeDefined();
    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
    expect(screen.getByRole("combobox", { name: "Search for a place" })).toBeDefined();
    expect(screen.queryByLabelText("Latitude")).toBeNull();
  });

  it("types coordinates and keeps them in step with the place", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-12.5" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "130.25" } });
    expect(document.body.textContent).toContain("Typed coordinates");
    expect(document.body.textContent).toContain("12.5000°S, 130.2500°E");
  });

  it("flags out-of-range coordinates without losing the page", () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "95" } });
    expect(screen.getByRole("alert").textContent).toBe("Latitude must be a number between -90 and 90.");
    expect(screen.getByRole("region", { name: "Map for choosing a place" })).toBeDefined();
  });

  it("puts date and time and the timezone with Detect in one pair", () => {
    render(<LandingPage />);
    const pair = document.getElementById("landing-when")?.closest(".atlas-form-pair");
    expect(pair?.querySelector("#landing-tz")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Detect my timezone" })).toBeDefined();
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
    for (const id of ["landing-projection", "landing-fisheye", "landing-separation", "landing-glow"]) {
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
    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
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

  it("carries the title into the #e= link, and leaves it null when empty", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(decodeExplorer(window.location.hash.slice(3)).title).toBeNull();
    window.location.hash = "";
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Our first flat" } });
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(decodeExplorer(window.location.hash.slice(3)).title).toBe("Our first flat");
  });

  it("refuses an undrawable title in place, with the Studio's message, and stays", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Night 🌌" } });
    expect(screen.getByRole("alert").textContent).toContain("🌌");
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(window.location.hash).toBe("");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Night" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Explore this sky is the only action: no poster button", () => {
    render(<LandingPage />);
    expect(screen.queryByRole("button", { name: /poster/i })).toBeNull();
    expect(document.querySelectorAll(".landing-actions button")).toHaveLength(1);
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
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(screen.getByRole("alert").textContent).toBe("Pick a date and time for the sky.");
    expect(window.location.hash).toBe("");
  });

  it("does not leave while the coordinates are invalid", () => {
    render(<LandingPage />);
    fixMoment();
    fireEvent.click(screen.getByRole("switch", { name: "Coordinates" }));
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "95" } });
    fireEvent.click(screen.getByRole("button", { name: "Explore this sky" }));
    expect(window.location.hash).toBe("");
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

describe("LandingPage #c= creation link (013)", () => {
  it("prefills the fields and the place from the link, with no geocoder call", () => {
    const calls: string[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = ((input: unknown) => {
      calls.push(String(input));
      return Promise.reject(new Error("no network in tests"));
    }) as typeof fetch;
    try {
      window.location.hash = `#c=${encodeCreation({ place: "Eiffel Tower, Paris", lat: 48.8584, lon: 2.2945, when_local: "2026-06-01T22:00", tz: "Europe/Paris", title: "Our first flat", magnitude_limit: 4.5 })}`;
      render(<LandingPage />);
      expect(screen.getByLabelText<HTMLInputElement>("Search for a place").value).toBe("Eiffel Tower, Paris");
      expect(screen.getByLabelText<HTMLInputElement>("Title").value).toBe("Our first flat");
      expect(screen.getByLabelText<HTMLInputElement>("Date and time").value).toBe("2026-06-01T22:00");
      expect(screen.getByLabelText<HTMLInputElement>("Timezone").value).toBe("Europe/Paris");
      expect(document.body.textContent).toContain("48.8584°N, 2.2945°E");
      expect(calls).toEqual([]);
    } finally {
      globalThis.fetch = real;
    }
  });

  it("shows coordinates alone when the link has none of a place", () => {
    window.location.hash = `#c=${encodeCreation({ lat: -12.5, lon: 130.25 })}`;
    render(<LandingPage />);
    expect(document.querySelector(".landing-selected-name")).toBeNull();
    expect(document.querySelector(".landing-selected-coords")?.textContent).toBe("12.5000°S, 130.2500°E");
  });

  it("keeps what is valid when one field is not", () => {
    window.location.hash = `#c=${encodeCreation({ title: "Kept", tz: "Mars/Olympus" })}`;
    render(<LandingPage />);
    expect(screen.getByLabelText<HTMLInputElement>("Title").value).toBe("Kept");
    expect(screen.getByLabelText<HTMLInputElement>("Timezone").value).not.toBe("Mars/Olympus");
    expect(screen.queryByText("That link could not be read, so the form is blank.")).toBeNull();
  });

  it("an unreadable link leaves a blank form and says so, politely", () => {
    window.location.hash = "#c=not-a-payload";
    render(<LandingPage />);
    const notice = screen.getByText("That link could not be read, so the form is blank.");
    expect(notice.getAttribute("role")).toBe("status");
    expect(screen.getByLabelText<HTMLInputElement>("Title").value).toBe("");
    expect(screen.getByRole("button", { name: "Explore this sky" })).toBeDefined();
  });

  it("writes the form to #c= once it rests, with replaceState and no new history entry", async () => {
    window.location.hash = "";
    const calls: string[] = [];
    const real = window.history.replaceState.bind(window.history);
    const length = window.history.length;
    window.history.replaceState = (state: unknown, unused: string, url?: string | URL | null) => {
      calls.push(String(url));
      real(state, unused, url);
    };
    try {
      render(<LandingPage />);
      await new Promise((resolve) => setTimeout(resolve, 450));
      expect(calls).toEqual([]);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "A" } });
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "AB" } });
      expect(calls).toEqual([]);
      await waitFor(() => {
        expect(calls).toHaveLength(1);
      });
      expect(calls[0]?.startsWith("#c=")).toBe(true);
      const decoded = decodeCreation((calls[0] ?? "").slice(3));
      expect(decoded.status === "ok" && decoded.creation.title).toBe("AB");
      expect(window.history.length).toBe(length);
    } finally {
      window.history.replaceState = real;
    }
  });

  it("has no copy-link button: the address bar is the link", () => {
    render(<LandingPage />);
    expect(screen.queryByRole("button", { name: /copy link/i })).toBeNull();
  });

  it("puts Advanced on its own row, with the one action in the row below", () => {
    render(<LandingPage />);
    const row = document.querySelector(".landing-foot");
    expect(row?.querySelector("details > summary")?.textContent).toBe("Advanced");
    expect(row?.querySelector(".landing-actions button")?.textContent).toBe("Explore this sky");
  });
});
