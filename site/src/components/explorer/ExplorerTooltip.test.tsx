import { afterEach, describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const domReady = (globalThis as unknown as Record<string, unknown>)["document"] !== undefined;
if (!domReady) {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

const { act, cleanup, render } = await import("@testing-library/react");
const { default: ExplorerTooltip } = await import("./ExplorerTooltip.tsx");
const { makeController } = await import("./harness.ts");
const { dirAt } = await import("../../lib/explorer/fixture.ts");
const { projectToViewport } = await import("../../lib/sky/camera.ts");
const { setLocale } = await import("../../i18n/index.ts");

const DELAY = 30;
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function mount() {
  const world = makeController();
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  let invalidations = 0;
  const original = world.controller.invalidate.bind(world.controller);
  world.controller.invalidate = () => {
    invalidations++;
    original();
  };
  const { container } = render(
    <div>
      <ExplorerTooltip
        controller={world.controller}
        scene={world.scene}
        canvas={canvas}
        rightInset={() => 0}
        delayMs={DELAY}
      />
    </div>,
  );
  const send = (type: string, init: PointerEventInit = {}): void => {
    act(() => {
      canvas.dispatchEvent(
        new PointerEvent(type, { pointerType: "mouse", clientX: 402, clientY: 301, bubbles: true, ...init }),
      );
    });
  };
  const tip = (): HTMLElement | null => container.querySelector(".explorer-tooltip");
  const rest = (ms = DELAY * 3): Promise<void> =>
    act(async () => {
      await wait(ms);
    });
  return { world, canvas, send, tip, rest, invalidations: () => invalidations, container };
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("ExplorerTooltip", () => {
  it("reads \"<name or HIP> • Magnitude <value>\" with no horizon text after the pointer rests", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    expect(tip()).toBeNull();
    await rest();
    expect(tip()?.textContent).toBe("HIP 1 • Magnitude 1.00");
    expect(tip()?.textContent).not.toMatch(/horizon/i);
  });

  it("is hidden from screen readers and never takes the pointer", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    await rest();
    expect(tip()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("never shows for touch, and a touch does not start the timer", async () => {
    const { send, tip, rest } = mount();
    send("pointermove", { pointerType: "touch" });
    await rest();
    expect(tip()).toBeNull();
  });

  it("shows for a pen", async () => {
    const { send, tip, rest } = mount();
    send("pointermove", { pointerType: "pen" });
    await rest();
    expect(tip()).not.toBeNull();
  });

  it("closes when the pointer moves off the star", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    await rest();
    send("pointermove", { clientX: 30, clientY: 30 });
    expect(tip()).toBeNull();
  });

  it("does not open if the pointer left before the delay", async () => {
    const { send, tip, rest } = mount();
    send("pointermove");
    send("pointermove", { clientX: 30, clientY: 30 });
    await rest();
    expect(tip()).toBeNull();
  });

  it("closes on a press, a wheel and when the pointer leaves the map", async () => {
    for (const type of ["pointerdown", "wheel", "pointerleave"]) {
      const { send, tip, rest, container } = mount();
      send("pointermove");
      await rest();
      expect(tip(), type).not.toBeNull();
      send(type);
      expect(tip(), type).toBeNull();
      cleanup();
      container.remove();
    }
  });

  it("does not open while a button is held, which is a drag", async () => {
    const { send, tip, rest } = mount();
    send("pointermove", { buttons: 1 });
    await rest();
    expect(tip()).toBeNull();
  });

  it("closes on Escape before anything else sees the key, and the selection is untouched", async () => {
    const { send, tip, rest, world } = mount();
    world.controller.select("HIP:2");
    send("pointermove");
    await rest();
    expect(tip()).not.toBeNull();
    let reached = false;
    const spy = (): void => {
      reached = true;
    };
    document.body.addEventListener("keydown", spy);
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    document.body.removeEventListener("keydown", spy);
    expect(tip()).toBeNull();
    expect(reached).toBe(false);
    expect(world.controller.getSelection()).toBe("HIP:2");
  });

  it("lets Escape through when no tooltip is open", () => {
    mount();
    let reached = false;
    const spy = (): void => {
      reached = true;
    };
    document.body.addEventListener("keydown", spy);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    document.body.removeEventListener("keydown", spy);
    expect(reached).toBe(true);
  });

  it("draws no frames: it never asks the controller to repaint", async () => {
    const { send, rest, invalidations } = mount();
    const before = invalidations();
    send("pointermove");
    send("pointermove", { clientX: 404, clientY: 303 });
    await rest();
    send("pointermove", { clientX: 30, clientY: 30 });
    send("pointerleave");
    expect(invalidations()).toBe(before);
  });
});

describe("ExplorerTooltip, a constellation (019)", () => {
  // "Test": HIP 1 at the centre, HIP 2 up and right; HIP 3 is the brightest and has no name.
  const NAMED = {
    stars: [
      { hip: 1, dir: dirAt(0, 0), mag: 1 },
      { hip: 2, dir: dirAt(10, 20), mag: 2 },
      { hip: 3, dir: dirAt(15, 30), mag: 0.5 },
      { hip: 4, dir: dirAt(-5, -10), mag: 3 },
      { hip: 5, dir: dirAt(20, 40), mag: 1.5 },
    ],
    segments: [
      ["Tst", "Test", 1, 2],
      ["Tst", "Test", 2, 3],
      ["Tst", "Test", 1, 4],
      ["Tst", "Test", 3, 5],
    ] as [string, string, number, number][],
    names: [
      [1, "Aaa"],
      [2, "Bbb"],
      [4, "Ccc"],
      [5, "Ddd"],
    ] as [number, string][],
  };

  function mountSky(sky: Parameters<typeof makeController>[1]) {
    const world = makeController(60, sky);
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const { container } = render(
      <ExplorerTooltip controller={world.controller} scene={world.scene} canvas={canvas} rightInset={() => 0} delayMs={DELAY} />,
    );
    const camera = world.controller.getCamera();
    const point = (alt: number, az: number): { x: number; y: number } => {
      const p = projectToViewport(camera, dirAt(alt, az), 800, 600);
      if (!p) throw new Error("off screen");
      return p;
    };
    // Halfway along HIP 1 to HIP 2, a few pixels off the line: no star near.
    const a = point(0, 0);
    const b = point(10, 20);
    const onLine = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 2 };
    const send = (type: string, at: { x: number; y: number }, init: PointerEventInit = {}): void => {
      act(() => {
        canvas.dispatchEvent(new PointerEvent(type, { pointerType: "mouse", clientX: at.x, clientY: at.y, bubbles: true, ...init }));
      });
    };
    const tip = (): HTMLElement | null => container.querySelector(".explorer-tooltip");
    const lines = (): string[] => [...container.querySelectorAll(".explorer-tooltip p")].map((p) => p.textContent);
    const rest = (): Promise<void> =>
      act(async () => {
        await wait(DELAY * 3);
      });
    return { world, onLine, star: a, send, tip, lines, rest };
  }

  afterEach(() => {
    setLocale("en-US", { persist: false });
  });

  it("names the figure, counts its stars, and lists three named stars brightest first with the rest", async () => {
    const { send, onLine, lines, rest, tip } = mountSky(NAMED);
    send("pointermove", onLine);
    expect(tip()).toBeNull();
    await rest();
    expect(lines()).toEqual(["Test • 5 stars", "Aaa, Ddd, Bbb +2"]);
    expect(tip()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the first line alone for a figure with no named star", async () => {
    const { send, onLine, lines, rest } = mountSky(undefined);
    send("pointermove", onLine);
    await rest();
    expect(lines()).toEqual(["Test • 2 stars"]);
  });

  it("reads in Portuguese, with the names untouched", async () => {
    setLocale("pt-BR", { persist: false });
    const { send, onLine, lines, rest } = mountSky(NAMED);
    send("pointermove", onLine);
    await rest();
    expect(lines()).toEqual(["Test • 5 estrelas", "Aaa, Ddd, Bbb +2"]);
  });

  it("gives a star under the pointer its own tooltip, even on the figure", async () => {
    const { send, star, lines, rest } = mountSky(NAMED);
    send("pointermove", { x: star.x + 2, y: star.y + 1 });
    await rest();
    expect(lines()).toEqual(["Aaa • Magnitude 1.00"]);
  });

  it("closes when the pointer moves from the figure onto a star, and starts that star's wait", async () => {
    const { send, onLine, star, tip, lines, rest } = mountSky(NAMED);
    send("pointermove", onLine);
    await rest();
    expect(tip()).not.toBeNull();
    send("pointermove", { x: star.x + 2, y: star.y + 1 });
    expect(tip()).toBeNull();
    await rest();
    expect(lines()).toEqual(["Aaa • Magnitude 1.00"]);
  });

  it("stays open while the pointer moves along the same figure", async () => {
    const { send, onLine, tip, rest } = mountSky(NAMED);
    send("pointermove", onLine);
    await rest();
    send("pointermove", { x: onLine.x + 3, y: onLine.y - 1 });
    expect(tip()).not.toBeNull();
  });

  it("closes on Escape, on a press and when the pointer leaves; never for touch", async () => {
    const { send, onLine, tip, rest } = mountSky(NAMED);
    send("pointermove", onLine);
    await rest();
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(tip()).toBeNull();
    for (const type of ["pointerdown", "pointerleave"]) {
      send("pointermove", { x: 30, y: 30 });
      send("pointermove", onLine);
      await rest();
      expect(tip(), type).not.toBeNull();
      send(type, onLine);
      expect(tip(), type).toBeNull();
    }
    send("pointermove", { x: 30, y: 30 });
    send("pointermove", onLine, { pointerType: "touch" });
    await rest();
    expect(tip()).toBeNull();
  });

  it("is not offered where the lines layer is off and no label is", async () => {
    const { world, send, onLine, tip, rest } = mountSky(NAMED);
    world.controller.setLayer("constellationLines", false);
    world.controller.setLayer("constellationLabels", false);
    send("pointermove", onLine);
    await rest();
    expect(tip()).toBeNull();
  });
});
