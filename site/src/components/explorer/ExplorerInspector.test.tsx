/**
 * Inspector component tests: what a star and a constellation show, that catalog
 * facts and derived values are labelled apart, and that missing data is left out.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { at } from "../../lib/testing.ts";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, fireEvent, render, screen, within } = await import("@testing-library/react");
const { default: ExplorerInspector } = await import("./ExplorerInspector.tsx");
const { CTX, dirAt, sceneOf } = await import("../../lib/explorer/fixture.ts");

import { HoverStore } from "../../lib/explorer/hover.ts";
import { prepareObserverView } from "../../lib/explorer/observerView.ts";

const { scene } = sceneOf(
  [
    { hip: 1, dir: dirAt(40, 90), mag: 0.5 },
    { hip: 2, dir: dirAt(10, 100), mag: 2 },
    { hip: 3, dir: dirAt(-20, 110), mag: 3 },
    { hip: 4, dir: dirAt(60, 0), mag: 4.25 },
    { hip: 5, dir: dirAt(-30, 200), mag: 3 },
    { hip: 6, dir: dirAt(-40, 210), mag: 3 },
  ],
  [
    ["Ori", "Orion", 1, 2],
    ["Ori", "Orion", 2, 3],
    ["Cru", "Crux", 3, 4],
    ["Vel", "Vela", 5, 6],
  ],
  [[1, "Rigel"]],
);
const view = prepareObserverView(scene, CTX);

interface Calls {
  chosen: string[];
  centered: number;
  cleared: number;
  toggled: number;
  closed: number;
}

function mount(selection: string | null, open = true, hover = new HoverStore()) {
  const calls: Calls = { chosen: [], centered: 0, cleared: 0, toggled: 0, closed: 0 };
  render(
    <ExplorerInspector
      scene={scene}
      view={view}
      selection={selection}
      hover={hover}
      open={open}
      onChoose={(id) => calls.chosen.push(id)}
      onCenter={() => {
        calls.centered++;
      }}
      onClear={() => {
        calls.cleared++;
      }}
      onToggle={() => {
        calls.toggled++;
      }}
      onClose={() => {
        calls.closed++;
      }}
    />,
  );
  return calls;
}

afterEach(() => {
  cleanup();
});

describe("ExplorerInspector, a star", () => {
  it("titles a named star by its name and separates catalog from derived facts", () => {
    mount("HIP:1");
    expect(screen.getByRole("heading", { name: "Rigel" })).toBeTruthy();
    const catalog = screen.getByRole("group", { name: "Catalog" });
    expect(within(catalog).getByText("HIP number")).toBeTruthy();
    expect(within(catalog).getByText("Apparent magnitude")).toBeTruthy();
    expect(within(catalog).getByText("Right ascension")).toBeTruthy();
    expect(within(catalog).getByText("Declination")).toBeTruthy();
    expect(within(catalog).queryByText("Altitude")).toBeNull();
    const derived = screen.getByRole("group", { name: "For this place and moment" });
    expect(within(derived).getByText("Altitude")).toBeTruthy();
    expect(within(derived).getByText("Azimuth")).toBeTruthy();
    expect(within(derived).queryByText("HIP number")).toBeNull();
  });

  it("shows altitude and azimuth as approximate, to 0.1 degree, with a note on precision", () => {
    mount("HIP:1");
    const derived = screen.getByRole("group", { name: "For this place and moment" });
    expect(derived.textContent).toMatch(/about \d+\.\d°/);
    expect(derived.textContent).toMatch(/Approximate, to 0\.1°/);
  });

  it("says the horizon status in words", () => {
    mount("HIP:1");
    expect(screen.getByText("Above the horizon")).toBeTruthy();
    cleanup();
    mount("HIP:3");
    expect(screen.getByText("Below the horizon")).toBeTruthy();
  });

  it("titles a star without a name by its HIP number and has no Name row", () => {
    mount("HIP:4");
    expect(screen.getByRole("heading", { name: "HIP 4" })).toBeTruthy();
    expect(screen.queryByText("Name")).toBeNull();
  });

  it("names the figure only when a figure uses the star, and selects it on click", () => {
    const calls = mount("HIP:2");
    const buttons = screen.getAllByRole("button", { name: /Part of the figure of/ });
    expect(buttons.map((b) => b.textContent)).toEqual(["Part of the figure of Orion"]);
    fireEvent.click(at(buttons, 0));
    expect(calls.chosen).toEqual(["CON:Ori"]);
  });

  it("offers no figure for a star no figure uses", () => {
    const { scene: bare } = sceneOf([{ hip: 9, dir: dirAt(30, 30), mag: 3 }]);
    render(
      <ExplorerInspector
        scene={bare}
        view={prepareObserverView(bare, CTX)}
        selection="HIP:9"
        hover={new HoverStore()}
        open
        onChoose={() => undefined}
        onCenter={() => undefined}
        onClear={() => undefined}
        onToggle={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.queryByText(/Part of the figure/)).toBeNull();
  });

  it("centers and clears through its actions", () => {
    const calls = mount("HIP:1");
    fireEvent.click(screen.getByRole("button", { name: "Center on map" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(calls.centered).toBe(1);
    expect(calls.cleared).toBe(1);
  });
});

describe("ExplorerInspector, a constellation", () => {
  it("shows name, abbreviation, star counts and the brightest star", () => {
    mount("CON:Ori");
    expect(screen.getByRole("heading", { name: "Orion" })).toBeTruthy();
    const catalog = screen.getByRole("group", { name: "Catalog" });
    expect(catalog.textContent).toContain("Ori");
    expect(catalog.textContent).toContain("Stars in the figure");
    expect(catalog.textContent).toContain("3");
    expect(catalog.textContent).toContain("Rigel, magnitude 0.50");
    const derived = screen.getByRole("group", { name: "For this place and moment" });
    expect(derived.textContent).toContain("Above the horizon now");
    expect(derived.textContent).toContain("2 of 3");
  });
});

describe("ExplorerInspector, nothing selected", () => {
  it("says so and lists the constellations above the horizon by name", () => {
    const calls = mount(null);
    expect(screen.getByText(/Nothing is selected/)).toBeTruthy();
    const list = screen.getByRole("list", { name: /Above the horizon/ });
    const names = within(list)
      .getAllByRole("button")
      .map((b) => b.querySelector("span:not(.sr-only)")?.textContent);
    expect(names).toEqual(["Crux", "Orion"]);
    // The visible text is the name and nothing else; no abbreviation, no "partly".
    for (const button of within(list).getAllByRole("button")) {
      expect(button.querySelectorAll("span:not(.sr-only)")).toHaveLength(1);
    }
    fireEvent.click(within(list).getByRole("button", { name: /Orion/ }));
    expect(calls.chosen).toEqual(["CON:Ori"]);
  });

  it("marks the selected constellation in the list", () => {
    mount("CON:Cru");
    const list = screen.getByRole("list", { name: /Above the horizon/ });
    expect(within(list).getByRole("button", { name: /Crux/ }).getAttribute("aria-current")).toBe("true");
    expect(within(list).getByRole("button", { name: /Orion/ }).getAttribute("aria-current")).toBeNull();
  });
});

describe("ExplorerInspector, constellations by the horizon", () => {
  const group = (name: RegExp): HTMLDetailsElement => {
    const summary = screen.getByText(name).closest("summary");
    const details = summary?.closest("details");
    if (!details) throw new Error("no group");
    return details;
  };

  it("splits the list in two with a count in each heading", () => {
    mount(null);
    expect(group(/^Above the horizon \(2\)$/)).toBeTruthy();
    expect(group(/^Below the horizon \(1\)$/)).toBeTruthy();
  });

  it("opens the top group and closes the bottom one", () => {
    mount(null);
    expect(group(/^Above the horizon/).open).toBe(true);
    expect(group(/^Below the horizon/).open).toBe(false);
  });

  it("says partly above the horizon to screen readers only, and only for a partly-below constellation", () => {
    mount(null);
    const above = screen.getByRole("list", { name: /Above the horizon/ });
    const hidden = within(above).getAllByText("partly above the horizon");
    expect(hidden).toHaveLength(2);
    for (const el of hidden) expect(el.className).toContain("sr-only");
    expect(within(above).getByRole("button", { name: "Orion partly above the horizon" })).toBeTruthy();
    const below = group(/^Below the horizon/);
    expect(within(below).queryByText("partly above the horizon")).toBeNull();
  });

  it("lets a constellation below the horizon be chosen", () => {
    const calls = mount(null);
    fireEvent.click(within(group(/^Below the horizon/)).getByRole("button", { name: /Vela/ }));
    expect(calls.chosen).toEqual(["CON:Vel"]);
  });

  it("opens the bottom group when the selection is in it", () => {
    mount("CON:Vel");
    expect(group(/^Below the horizon/).open).toBe(true);
    expect(within(group(/^Below the horizon/)).getByRole("button", { name: /Vela/ }).getAttribute("aria-current")).toBe("true");
  });
});

describe("ExplorerInspector, open and closed", () => {
  it("hides its body when closed, and the handle says so", () => {
    mount("HIP:1", false);
    const handle = screen.getByRole("button", { name: /Show details/ });
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(handle.getAttribute("aria-controls") ?? "")?.hidden).toBe(true);
  });

  it("toggles from the handle and closes from its own button", () => {
    const calls = mount("HIP:1");
    const handle = screen.getByRole("button", { name: /Hide details/ });
    expect(handle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(handle);
    const close = screen.getByRole("button", { name: "Close inspector" });
    expect(close.textContent).toBe("");
    expect(close.getAttribute("title")).toBe("Close inspector");
    expect(close.querySelector("svg")?.getAttribute("data-icon")).toBe("close");
    fireEvent.click(close);
    expect(calls.toggled).toBe(1);
    expect(calls.closed).toBe(1);
  });
});


describe("ExplorerInspector hover (FR-013)", () => {
  const item = (name: RegExp): HTMLElement => screen.getByRole("button", { name });
  let scrolls: { el: Element; arg: unknown }[] = [];
  const original: Element["scrollIntoView"] = Element.prototype.scrollIntoView.bind(Element.prototype);

  function spy(): void {
    scrolls = [];
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions): void {
      scrolls.push({ el: this, arg });
    };
  }
  afterEach(() => {
    Element.prototype.scrollIntoView = original;
  });

  it("styles the matching list item and scrolls it into view, without moving focus or the order", () => {
    spy();
    const hover = new HoverStore();
    mount(null, true, hover);
    const before = screen.getAllByRole("button", { name: /Orion|Crux/ }).map((b) => b.textContent);
    const focused = document.activeElement;
    act(() => {
      hover.set("CON:Ori", "canvas");
    });
    expect(item(/Orion/).getAttribute("data-hover")).toBe("true");
    expect(item(/Crux/).getAttribute("data-hover")).toBeNull();
    expect(scrolls).toHaveLength(1);
    expect(scrolls[0]?.el).toBe(item(/Orion/));
    expect((scrolls[0]?.arg as ScrollIntoViewOptions).block).toBe("nearest");
    expect(document.activeElement).toBe(focused);
    expect(screen.getAllByRole("button", { name: /Orion|Crux/ }).map((b) => b.textContent)).toEqual(before);
    act(() => {
      hover.set(null, "canvas");
    });
    expect(item(/Orion/).getAttribute("data-hover")).toBeNull();
  });

  it("does not scroll when the hover came from the list itself", () => {
    spy();
    const hover = new HoverStore();
    mount(null, true, hover);
    fireEvent.pointerEnter(item(/Orion/), { pointerType: "mouse" });
    expect(hover.id).toBe("CON:Ori");
    expect(hover.source).toBe("list");
    expect(scrolls).toHaveLength(0);
    fireEvent.pointerLeave(item(/Orion/), { pointerType: "mouse" });
    expect(hover.id).toBeNull();
  });

  it("ignores touch pointers", () => {
    const hover = new HoverStore();
    mount(null, true, hover);
    fireEvent.pointerEnter(item(/Orion/), { pointerType: "touch" });
    expect(hover.id).toBeNull();
  });

  it("shows the hover style on the collapsed Below group's summary and leaves it closed", () => {
    spy();
    const hover = new HoverStore();
    mount(null, true, hover);
    const below = [...document.querySelectorAll("details.explorer-group")].find((d) => d.querySelector("summary")?.textContent?.startsWith("Below"));
    expect(below?.hasAttribute("open")).toBe(false);
    act(() => {
      hover.set("CON:Vel", "canvas");
    });
    expect(below?.querySelector("summary")?.getAttribute("data-hover")).toBe("true");
    expect(below?.hasAttribute("open")).toBe(false);
    act(() => {
      hover.set("CON:Ori", "canvas");
    });
    expect(below?.querySelector("summary")?.getAttribute("data-hover")).toBeNull();
  });
});
