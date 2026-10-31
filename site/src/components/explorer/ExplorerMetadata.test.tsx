import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { default: ExplorerMetadata } = await import("./ExplorerMetadata.tsx");
const { MetadataMachine } = await import("../../lib/explorer/metadata.ts");

import type { MomentInput } from "../../lib/explorer/metadata.ts";

const MOMENT: MomentInput = {
  lat: 35.6895,
  lon: 139.6917,
  place: "Tokyo",
  title: "First night",
  when_utc: "1998-11-17T02:17:00Z",
  tz: "Asia/Tokyo",
};

function mount(moment = MOMENT) {
  const clock = { t: 0 };
  const machine = new MetadataMachine({ now: () => clock.t });
  const view = render(<ExplorerMetadata moment={moment} machine={machine} />);
  return { clock, machine, view };
}

const region = (): HTMLElement => screen.getByRole("region", { name: "Moment" });

/** What a screen reader gets: text not hidden from it. */
function readable(): string {
  const parts: string[] = [];
  const walk = (node: Element): void => {
    if (node.getAttribute("aria-hidden") === "true") return;
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) parts.push(child.textContent ?? "");
      else walk(child as Element);
    }
  };
  walk(region());
  return parts.join("|");
}

afterEach(() => {
  cleanup();
});

describe("ExplorerMetadata actions", () => {
  it("shows what it is given beside the pin, inside the strip", () => {
    const machine = new MetadataMachine({ now: () => 0 });
    render(
      <ExplorerMetadata moment={MOMENT} machine={machine}>
        <button type="button" aria-label="side-action" />
      </ExplorerMetadata>,
    );
    const pin = screen.getByRole("button", { name: "Keep details open" });
    const action = screen.getByRole("button", { name: "side-action" });
    expect(region().contains(action)).toBe(true);
    expect(pin.parentElement).toBe(action.parentElement);
  });
});

describe("ExplorerMetadata", () => {
  it("starts expanded and shows the moment", () => {
    mount();
    expect(region().getAttribute("data-mode")).toBe("expanded");
    expect(region().textContent).toContain("First night");
    expect(region().textContent).toContain("Tokyo");
    expect(region().textContent).toContain("Nov 17, 1998, 11:17 AM GMT+9");
  });

  it("shows the one-line form: title, place and time", () => {
    mount();
    expect(region().textContent).toContain("First night · Tokyo · Nov 17, 1998, 11:17 AM GMT+9");
  });

  it("omits a missing title", () => {
    mount({ ...MOMENT, title: null });
    expect(region().textContent).not.toContain("null");
    expect(region().querySelector(".explorer-moment-title")).toBeNull();
  });

  it("goes compact when idle and expands again on pointer, touch or key activity", () => {
    const { clock, machine } = mount();
    clock.t = 3000;
    act(() => {
      machine.tick();
    });
    expect(region().getAttribute("data-mode")).toBe("compact");
    for (const type of ["pointermove", "touchstart", "keydown", "pointerdown"]) {
      act(() => {
        clock.t = 6000;
        machine.tick();
      });
      expect(region().getAttribute("data-mode")).toBe("compact");
      act(() => {
        document.dispatchEvent(new Event(type, { bubbles: true }));
      });
      expect(region().getAttribute("data-mode")).toBe("expanded");
      clock.t += 4000;
      act(() => {
        machine.tick();
      });
    }
  });

  it("never hides: the strip and its pin stay in the document in every mode", () => {
    const { clock, machine } = mount();
    clock.t = 3000;
    act(() => {
      machine.tick();
    });
    expect(region().textContent).toContain("Tokyo");
    expect(screen.getByRole("button", { name: "Keep details open" })).toBeTruthy();
  });

  it("pins on request and stays pinned through idle time", () => {
    const { clock, machine } = mount();
    const pin = screen.getByRole("button", { name: "Keep details open" });
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(pin);
    expect(region().getAttribute("data-mode")).toBe("pinned");
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    clock.t = 60_000;
    act(() => {
      machine.tick();
    });
    expect(region().getAttribute("data-mode")).toBe("pinned");
    fireEvent.click(pin);
    expect(region().getAttribute("data-mode")).toBe("expanded");
  });

  it("gives a screen reader the same text in every mode", () => {
    const { clock, machine } = mount();
    const expanded = readable();
    expect(expanded).toContain("First night, Tokyo, Nov 17, 1998, 11:17 AM GMT+9, 35.6895°N, 139.6917°E");
    clock.t = 3000;
    act(() => {
      machine.tick();
    });
    expect(readable()).toBe(expanded);
    fireEvent.click(screen.getByRole("button", { name: "Keep details open" }));
    expect(readable()).toBe(expanded);
  });

  it("compacts by itself after the idle time, using a real timer", async () => {
    const machine = new MetadataMachine({ now: () => Date.now(), idleMs: 30 });
    render(<ExplorerMetadata moment={MOMENT} machine={machine} />);
    expect(region().getAttribute("data-mode")).toBe("expanded");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(region().getAttribute("data-mode")).toBe("compact");
  });
});
