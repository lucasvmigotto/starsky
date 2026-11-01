import { describe, expect, it } from "bun:test";
import { CHROME_IDLE_MS, type ChromeHold, ChromeMachine } from "./chrome.ts";

function make() {
  const clock = { t: 1000 };
  const machine = new ChromeMachine({ now: () => clock.t });
  const seen: string[] = [];
  machine.subscribe(() => seen.push(machine.state));
  return { clock, machine, seen };
}

describe("ChromeMachine", () => {
  it("starts hidden and hides after four seconds", () => {
    expect(CHROME_IDLE_MS).toBe(4000);
    const { machine } = make();
    expect(machine.state).toBe("hidden");
    expect(machine.msUntilHide()).toBeNull();
  });

  it("shows on activity and says whether it changed anything", () => {
    const { machine } = make();
    expect(machine.activity()).toBe(true);
    expect(machine.state).toBe("visible");
    expect(machine.activity()).toBe(false);
  });

  it("hides exactly when four seconds have passed without activity", () => {
    const { clock, machine } = make();
    machine.activity();
    clock.t += 3999;
    expect(machine.tick()).toBe(false);
    expect(machine.state).toBe("visible");
    clock.t += 1;
    expect(machine.tick()).toBe(true);
    expect(machine.state).toBe("hidden");
    expect(machine.tick()).toBe(false);
  });

  it("moves the deadline with every activity", () => {
    const { clock, machine } = make();
    machine.activity();
    clock.t += 3000;
    machine.activity();
    expect(machine.msUntilHide()).toBe(4000);
    clock.t += 3999;
    expect(machine.tick()).toBe(false);
    clock.t += 1;
    expect(machine.tick()).toBe(true);
  });

  it("counts down the time left", () => {
    const { clock, machine } = make();
    machine.activity();
    clock.t += 1500;
    expect(machine.msUntilHide()).toBe(2500);
    clock.t += 9000;
    expect(machine.msUntilHide()).toBe(0);
  });

  for (const kind of ["popover", "focus", "pointer", "pinned", "drag"] as ChromeHold[]) {
    it(`does not hide while ${kind} is held`, () => {
      const { clock, machine } = make();
      machine.activity();
      machine.hold(kind, true);
      clock.t += 60_000;
      expect(machine.tick()).toBe(false);
      expect(machine.state).toBe("visible");
      expect(machine.msUntilHide()).toBeNull();
    });

    it(`restarts the timer when ${kind} is released`, () => {
      const { clock, machine } = make();
      machine.activity();
      machine.hold(kind, true);
      clock.t += 60_000;
      machine.hold(kind, false);
      expect(machine.msUntilHide()).toBe(4000);
      clock.t += 3999;
      expect(machine.tick()).toBe(false);
      clock.t += 1;
      expect(machine.tick()).toBe(true);
    });
  }

  it("stays visible until every hold is released", () => {
    const { clock, machine } = make();
    machine.activity();
    machine.hold("popover", true);
    machine.hold("pointer", true);
    machine.hold("popover", false);
    clock.t += 10_000;
    expect(machine.tick()).toBe(false);
    machine.hold("pointer", false);
    clock.t += 4000;
    expect(machine.tick()).toBe(true);
  });

  it("brings the chrome back when something takes hold of it while hidden", () => {
    const { machine } = make();
    expect(machine.hold("focus", true)).toBe(true);
    expect(machine.state).toBe("visible");
  });

  it("ignores a repeated hold or release", () => {
    const { machine } = make();
    machine.activity();
    expect(machine.hold("drag", true)).toBe(false);
    expect(machine.hold("drag", true)).toBe(false);
    expect(machine.hold("drag", false)).toBe(false);
    expect(machine.hold("drag", false)).toBe(false);
  });

  it("notifies only when the state changes", () => {
    const { clock, machine, seen } = make();
    machine.activity();
    machine.activity();
    clock.t += 4000;
    machine.tick();
    machine.tick();
    expect(seen).toEqual(["visible", "hidden"]);
  });

  it("stops notifying after unsubscribe", () => {
    const { machine } = make();
    let calls = 0;
    const off = machine.subscribe(() => {
      calls++;
    });
    off();
    machine.activity();
    expect(calls).toBe(0);
  });

  it("honours another idle time", () => {
    const clock = { t: 0 };
    const machine = new ChromeMachine({ now: () => clock.t, idleMs: 100 });
    machine.activity();
    clock.t = 100;
    expect(machine.tick()).toBe(true);
  });
});
