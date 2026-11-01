import { describe, expect, it } from "bun:test";
import { HOVER_DELAY_MS, HoverMachine, placeTooltip } from "./tooltip.ts";

function make() {
  const timers: { callback: () => void; ms: number; cleared: boolean }[] = [];
  const machine = new HoverMachine({
    setTimer: (callback, ms) => timers.push({ callback, ms, cleared: false }) - 1,
    clearTimer: (handle) => {
      timers[handle].cleared = true;
    },
  });
  const fire = (): void => {
    const pending = timers.filter((t) => !t.cleared);
    const last = pending[pending.length - 1];
    last.cleared = true;
    last.callback();
  };
  const live = (): number => timers.filter((t) => !t.cleared).length;
  return { machine, timers, fire, live };
}

describe("HoverMachine", () => {
  it("opens after 1500 ms of resting on a star, not before", () => {
    const { machine, timers, fire } = make();
    expect(HOVER_DELAY_MS).toBe(1500);
    machine.over("HIP:1");
    expect(timers[0].ms).toBe(1500);
    expect(machine.open).toBeNull();
    fire();
    expect(machine.open).toBe("HIP:1");
  });

  it("keeps the same timer while the pointer stays on the same star", () => {
    const { machine, timers, live } = make();
    machine.over("HIP:1");
    machine.over("HIP:1");
    machine.over("HIP:1");
    expect(timers).toHaveLength(1);
    expect(live()).toBe(1);
  });

  it("starts nothing over empty sky, and nothing runs while nothing rests on a star", () => {
    const { machine, timers } = make();
    machine.over(null);
    expect(timers).toHaveLength(0);
  });

  it("clears the timer when the pointer moves off the star", () => {
    const { machine, live } = make();
    machine.over("HIP:1");
    machine.over(null);
    expect(live()).toBe(0);
    expect(machine.open).toBeNull();
  });

  it("restarts for a different star and closes an open tooltip", () => {
    const { machine, fire, live, timers } = make();
    machine.over("HIP:1");
    fire();
    machine.over("HIP:2");
    expect(machine.open).toBeNull();
    expect(live()).toBe(1);
    expect(timers).toHaveLength(2);
    fire();
    expect(machine.open).toBe("HIP:2");
  });

  it("closes on a drag, a wheel or leaving the map, and starts over after", () => {
    const { machine, fire, timers } = make();
    machine.over("HIP:1");
    fire();
    machine.reset();
    expect(machine.open).toBeNull();
    machine.over("HIP:1");
    expect(timers).toHaveLength(2);
    fire();
    expect(machine.open).toBe("HIP:1");
  });

  it("closes on Escape, says it did, and does not reopen over the same star", () => {
    const { machine, fire, timers } = make();
    machine.over("HIP:1");
    fire();
    expect(machine.escape()).toBe(true);
    expect(machine.open).toBeNull();
    machine.over("HIP:1");
    expect(timers).toHaveLength(1);
    expect(machine.escape()).toBe(false);
  });

  it("cancels a pending timer on Escape without claiming the key", () => {
    const { machine, live } = make();
    machine.over("HIP:1");
    expect(machine.escape()).toBe(false);
    expect(live()).toBe(0);
  });

  it("tells subscribers only when it opens or closes", () => {
    const { machine, fire } = make();
    let calls = 0;
    const off = machine.subscribe(() => {
      calls++;
    });
    machine.over("HIP:1");
    expect(calls).toBe(0);
    fire();
    expect(calls).toBe(1);
    machine.reset();
    expect(calls).toBe(2);
    machine.reset();
    expect(calls).toBe(2);
    off();
    machine.over("HIP:1");
    fire();
    expect(calls).toBe(2);
  });
});

describe("placeTooltip", () => {
  const size = { width: 160, height: 48 };
  const bounds = { width: 1000, height: 700, rightInset: 0 };

  function rectOf(at: { left: number; top: number }) {
    return { left: at.left, top: at.top, right: at.left + size.width, bottom: at.top + size.height };
  }

  /** The star point, padded by its glyph, must stay clear of the tooltip. */
  function clearOfStar(at: { left: number; top: number }, star: { x: number; y: number }, pad = 6): boolean {
    const r = rectOf(at);
    return !(star.x + pad > r.left && star.x - pad < r.right && star.y + pad > r.top && star.y - pad < r.bottom);
  }

  function inside(at: { left: number; top: number }, b = bounds): boolean {
    const r = rectOf(at);
    return r.left >= 0 && r.top >= 0 && r.right <= b.width - b.rightInset && r.bottom <= b.height;
  }

  it("puts it to the right of a star in open sky", () => {
    const star = { x: 400, y: 300 };
    const at = placeTooltip(star, size, bounds);
    expect(at.left).toBeGreaterThan(star.x);
    expect(inside(at)).toBe(true);
    expect(clearOfStar(at, star)).toBe(true);
  });

  it("flips to the left near the right edge", () => {
    const star = { x: 960, y: 300 };
    const at = placeTooltip(star, size, bounds);
    expect(rectOf(at).right).toBeLessThan(star.x);
    expect(inside(at)).toBe(true);
  });

  it("stays left of an open side panel", () => {
    const panel = { ...bounds, rightInset: 320 };
    const star = { x: 640, y: 300 };
    const at = placeTooltip(star, size, panel);
    expect(inside(at, panel)).toBe(true);
    expect(clearOfStar(at, star)).toBe(true);
  });

  it("stays inside the screen and off the star at every corner and edge", () => {
    for (const x of [2, 500, 998]) {
      for (const y of [2, 350, 698]) {
        const star = { x, y };
        const at = placeTooltip(star, size, bounds);
        expect(inside(at), `${String(x)},${String(y)}`).toBe(true);
        expect(clearOfStar(at, star), `${String(x)},${String(y)}`).toBe(true);
      }
    }
  });

  it("falls back to the roomiest side and still stays on screen in a tiny viewport", () => {
    const tiny = { width: 200, height: 120, rightInset: 0 };
    const at = placeTooltip({ x: 100, y: 60 }, size, tiny);
    expect(inside(at, tiny)).toBe(true);
  });
});
