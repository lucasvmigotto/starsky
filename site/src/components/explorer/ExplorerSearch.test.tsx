import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: ExplorerSearch } = await import("./ExplorerSearch.tsx");
const { dirAt, sceneOf } = await import("../../lib/explorer/fixture.ts");

const { scene } = sceneOf(
  [
    { hip: 32349, dir: dirAt(30, 10), mag: -1.46 },
    { hip: 27989, dir: dirAt(40, 20), mag: 0.5 },
    { hip: 3, dir: dirAt(41, 20), mag: 3 },
    { hip: 4, dir: dirAt(50, 30), mag: 3 },
  ],
  [
    ["Ori", "Orion", 27989, 3],
    ["Ser", "Serpens", 4, 3],
  ],
  [
    [32349, "Sirius"],
    [27989, "Bételgeuse"],
  ],
);

function mount() {
  const chosen: string[] = [];
  let closed = 0;
  render(
    <ExplorerSearch
      scene={scene}
      magLimit={6.5}
      onChoose={(id) => chosen.push(id)}
      onClose={() => {
        closed++;
      }}
    />,
  );
  const input = screen.getByRole("combobox", { name: "Search constellations and stars" });
  const type = (value: string): void => {
    fireEvent.change(input, { target: { value } });
  };
  return { input, type, chosen, closed: () => closed };
}

afterEach(() => {
  cleanup();
});

describe("ExplorerSearch", () => {
  it("is a labelled combobox that controls a listbox", () => {
    const { input, type } = mount();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    type("ori");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const list = screen.getByRole("listbox", { name: "Search results" });
    expect(input.getAttribute("aria-controls")).toBe(list.id);
  });

  it("lists matches with their kind and detail", () => {
    const { type } = mount();
    type("ori");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain("Orion");
    expect(options[0]?.textContent).toContain("Constellation");
    expect(options[0]?.textContent).toContain("Ori");
  });

  it("finds a star by HIP number and shows its magnitude", () => {
    const { type } = mount();
    type("hip 32349");
    expect(screen.getByRole("option").textContent).toContain("HIP 32349, magnitude -1.46");
  });

  it("ignores diacritics", () => {
    const { type } = mount();
    type("betelgeuse");
    expect(screen.getByRole("option").textContent).toContain("Bételgeuse");
  });

  it("moves with the arrow keys and chooses with Enter", () => {
    const { input, type, chosen } = mount();
    type("s");
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0]?.id ?? "x");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(chosen).toHaveLength(1);
    expect(chosen[0]).toBe(screen.getAllByRole("option")[1]?.getAttribute("data-id") ?? "");
  });

  it("wraps with ArrowUp from the first result", () => {
    const { input, type } = mount();
    type("s");
    const count = screen.getAllByRole("option").length;
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[count - 1]?.getAttribute("aria-selected")).toBe("true");
  });

  it("chooses by click", () => {
    const { type, chosen } = mount();
    type("sirius");
    fireEvent.click(screen.getByRole("option"));
    expect(chosen).toEqual(["HIP:32349"]);
  });

  it("announces no matches in a status region", () => {
    const { type } = mount();
    type("zzzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe("No matches.");
  });

  it("announces how many results there are", () => {
    const { type } = mount();
    type("sirius");
    expect(screen.getByRole("status").textContent).toBe("1 result.");
    type("s");
    expect(screen.getByRole("status").textContent).toMatch(/^\d+ results\.$/);
  });

  it("says nothing before anything is typed", () => {
    mount();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("closes on Escape and from its button", () => {
    const { input, closed } = mount();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(closed()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(closed()).toBe(2);
  });

  it("does not choose on Enter when there is nothing to choose", () => {
    const { input, type, chosen } = mount();
    type("zzzz");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(chosen).toEqual([]);
  });
});
