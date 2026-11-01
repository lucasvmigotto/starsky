import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

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
      debounceMs={5}
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

describe("PlaceSearch", () => {
  it("is a combobox tied to a listbox, closed at first", () => {
    mount([PARIS]);
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().getAttribute("aria-autocomplete")).toBe("list");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("searches after the pause, lists the results and announces the count", async () => {
    const h = mount([PARIS, PARIS_TX]);
    type("paris");
    expect(h.queries).toHaveLength(0);
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    expect(h.queries).toEqual(["paris"]);
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox", { name: "Matching places" })).toBeDefined();
    expect(screen.getByRole("status").textContent).toBe("2 places found. Use the arrow keys to choose one.");
  });

  it("announces a single result with its own wording", async () => {
    mount([PARIS]);
    type("paris");
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("1 place found. Use the arrow keys to choose it.");
    });
  });

  it("moves with the arrow keys and chooses with Enter", async () => {
    const h = mount([PARIS, PARIS_TX]);
    type("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    const first = screen.getAllByRole("option")[0];
    expect(input().getAttribute("aria-activedescendant")).toBe(first.id);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const second = screen.getAllByRole("option")[1];
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(input().getAttribute("aria-activedescendant")).toBe(second.id);
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(h.chosen).toEqual([PARIS_TX]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect((input() as HTMLInputElement).value).toBe("Paris, Texas, United States");
  });

  it("wraps around at both ends", async () => {
    mount([PARIS, PARIS_TX]);
    type("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1]?.getAttribute("aria-selected")).toBe("true");
  });

  it("chooses on a click", async () => {
    const h = mount([PARIS, PARIS_TX]);
    type("paris");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    fireEvent.click(screen.getAllByRole("option")[0]);
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
    type("paris");
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
    type("zzzzz");
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("No place found for “zzzzz”");
    });
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("says so, politely, when the service fails, and the field keeps working", async () => {
    mount(new Error("HTTP 503"));
    type("paris");
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
        debounceMs={5}
        search={(query, signal) => {
          h.queries.push(query);
          h.signals.push(signal);
          return new Promise<ResolvedPlace[]>(() => undefined);
        }}
        onChoose={() => undefined}
      />,
    );
    type("paris");
    await waitFor(() => {
      expect(h.signals).toHaveLength(1);
    });
    type("parisx");
    expect(h.signals[0]?.aborted).toBe(true);
  });

  it("follows the page when the place changes elsewhere", () => {
    const { rerender } = render(
      <PlaceSearch fieldText="Paris" debounceMs={5} search={() => Promise.resolve([])} onChoose={() => undefined} />,
    );
    expect((input() as HTMLInputElement).value).toBe("Paris");
    rerender(<PlaceSearch fieldText="" debounceMs={5} search={() => Promise.resolve([])} onChoose={() => undefined} />);
    expect((input() as HTMLInputElement).value).toBe("");
  });
});
