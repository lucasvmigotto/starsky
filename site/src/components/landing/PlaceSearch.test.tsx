import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { at } from "../../lib/testing.ts";

if ((globalThis as unknown as Record<string, unknown>)["document"] === undefined) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const { default: PlaceSearch } = await import("./PlaceSearch.tsx");

import type { ResolvedPlace } from "../../lib/geocode.ts";

const PARIS: ResolvedPlace = { lat: 48.85, lon: 2.35, displayName: "Paris, France", short: "Paris, France" };
const PARIS_TX: ResolvedPlace = { lat: 33.66, lon: -95.55, displayName: "Paris, Texas", short: "Paris, Texas, United States" };

afterEach(() => {
  cleanup();
});

interface Harness {
  queries: string[];
  signals: AbortSignal[];
  chosen: ResolvedPlace[];
}

function mount(result: ResolvedPlace[] | Error, fieldText = ""): Harness {
  const h: Harness = { queries: [], signals: [], chosen: [] };
  render(
    <PlaceSearch
      fieldText={fieldText}
      search={(query, signal) => {
        h.queries.push(query);
        h.signals.push(signal);
        return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
      }}
      onChoose={(place) => h.chosen.push(place)}
    />,
  );
  return h;
}

const input = () => screen.getByRole("combobox", { name: "Search for a place" });

function type(text: string): void {
  fireEvent.change(input(), { target: { value: text } });
}

const searchButton = () => screen.getByRole("button", { name: "Search" });

/** Type, then press the search button. */
function typeAndSearch(text: string): void {
  type(text);
  fireEvent.click(searchButton());
}

describe("PlaceSearch", () => {
  it("is a combobox tied to a listbox, closed at first", () => {
    mount([PARIS]);
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().getAttribute("aria-autocomplete")).toBe("list");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("typing sends nothing; the button searches, lists the results and announces the count", async () => {
    const h = mount([PARIS, PARIS_TX]);
    type("paris");
    expect(h.queries).toHaveLength(0);
    fireEvent.click(searchButton());
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    expect(h.queries).toEqual(["paris"]);
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox", { name: "Matching places" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("2 places found. Use the arrow keys to choose one.");
  });

  it("leaving the field with new text searches once", () => {
    const h = mount([PARIS]);
    type("paris");
    fireEvent.blur(input());
    expect(h.queries).toEqual(["paris"]);
    fireEvent.blur(input());
    expect(h.queries).toEqual(["paris"]);
  });

  it("leaving the field with empty, unchanged or chosen text searches nothing", () => {
    const h = mount([PARIS], "Paris, France");
    fireEvent.blur(input());
    type("  ");
    fireEvent.blur(input());
    type("paris, france");
    fireEvent.blur(input());
    expect(h.queries).toHaveLength(0);
  });

  it("blur after a button search sends nothing extra", () => {
    const h = mount([PARIS]);
    typeAndSearch("paris");
    fireEvent.blur(input());
    expect(h.queries).toEqual(["paris"]);
  });

  it("blur after choosing a result, or towards the button, sends nothing", async () => {
    const h = mount([PARIS]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
    fireEvent.click(at(screen.getAllByRole("option"), 0));
    fireEvent.blur(input());
    type("rome");
    fireEvent.blur(input(), { relatedTarget: searchButton() });
    expect(h.queries).toEqual(["paris"]);
  });

  it("has a search button named and titled Search", () => {
    mount([PARIS]);
    expect(searchButton().getAttribute("title")).toBe("Search");
    expect(searchButton().className).toContain("atlas-btn-icon");
  });

  it("the button with an empty field searches nothing", () => {
    const h = mount([PARIS]);
    fireEvent.click(searchButton());
    expect(h.queries).toHaveLength(0);
  });

  it("typing after results closes the list", async () => {
    mount([PARIS]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
    type("parisx");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("announces a single result with its own wording", async () => {
    mount([PARIS]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("1 place found. Use the arrow keys to choose it.");
    });
  });

  it("moves with the arrow keys and chooses with Enter", async () => {
    const h = mount([PARIS, PARIS_TX]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    const first = at(screen.getAllByRole("option"), 0);
    expect(input().getAttribute("aria-activedescendant")).toBe(first.id);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const second = at(screen.getAllByRole("option"), 1);
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(input().getAttribute("aria-activedescendant")).toBe(second.id);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(h.chosen).toEqual([PARIS_TX]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect((input() as HTMLInputElement).value).toBe("Paris, Texas, United States");
  });

  it("wraps around at both ends", async () => {
    mount([PARIS, PARIS_TX]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1]?.getAttribute("aria-selected")).toBe("true");
  });

  it("chooses on a click", async () => {
    const h = mount([PARIS, PARIS_TX]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    fireEvent.click(at(screen.getAllByRole("option"), 0));
    expect(h.chosen).toEqual([PARIS]);
  });

  it("Enter with no list searches at once", async () => {
    const h = mount([PARIS]);
    fireEvent.change(input(), { target: { value: "Rio" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(h.queries).toContain("Rio");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
  });

  it("Escape closes the list and keeps the text", async () => {
    mount([PARIS]);
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect((input() as HTMLInputElement).value).toBe("paris");
  });

  it("says so when nothing matches, and points to the map and coordinates", async () => {
    mount([]);
    typeAndSearch("zzzzz");
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("No place found for “zzzzz”");
    });
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("says so, politely, when the service fails, and the field keeps working", async () => {
    mount(new Error("HTTP 503"));
    typeAndSearch("paris");
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Place search is unavailable right now. Use the map or coordinates instead.",
      );
    });
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("role")).toBe("status");
    expect((input() as HTMLInputElement).disabled).toBe(false);
  });

  it("aborts the request in flight when the text changes", async () => {
    const h: Harness = { queries: [], signals: [], chosen: [] };
    render(
      <PlaceSearch
        fieldText=""
          search={(query, signal) => {
          h.queries.push(query);
          h.signals.push(signal);
          return new Promise<ResolvedPlace[]>(() => undefined);
        }}
        onChoose={() => undefined}
      />,
    );
    typeAndSearch("paris");
    await waitFor(() => {
      expect(h.signals).toHaveLength(1);
    });
    type("parisx");
    expect(h.signals[0]?.aborted).toBe(true);
  });

  it("follows the page when the place changes elsewhere", () => {
    const { rerender } = render(
      <PlaceSearch fieldText="Paris" search={() => Promise.resolve([])} onChoose={() => undefined} />,
    );
    expect((input() as HTMLInputElement).value).toBe("Paris");
    rerender(<PlaceSearch fieldText="" search={() => Promise.resolve([])} onChoose={() => undefined} />);
    expect((input() as HTMLInputElement).value).toBe("");
  });
});
