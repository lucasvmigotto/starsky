import { describe, expect, it } from "bun:test";
import type { ResolvedPlace } from "../geocode.ts";
import { type SearchState, createSearchController } from "./search.ts";

const PARIS: ResolvedPlace = { lat: 48.85, lon: 2.35, displayName: "Paris, France", short: "Paris, France" };

/** Timers the test fires by hand, so no real waiting. */
function fakeTimers() {
  const pending = new Map<number, { fn: () => void; ms: number }>();
  let next = 1;
  return {
    set: (fn: () => void, ms: number): number => {
      pending.set(next, { fn, ms });
      return next++;
    },
    clear: (id: number): void => {
      pending.delete(id);
    },
    count: () => pending.size,
    lastDelay: () => [...pending.values()].pop()?.ms,
    fire: () => {
      const entries = [...pending.entries()];
      pending.clear();
      for (const [, e] of entries) e.fn();
    },
  };
}

interface Call {
  query: string;
  signal: AbortSignal;
  resolve: (r: ResolvedPlace[]) => void;
  reject: (e: unknown) => void;
}

function setup(minLength?: number) {
  const timers = fakeTimers();
  const calls: Call[] = [];
  const states: SearchState[] = [];
  const controller = createSearchController({
    search: (query, signal) =>
      new Promise<ResolvedPlace[]>((resolve, reject) => {
        calls.push({ query, signal, resolve, reject });
      }),
    onState: (s) => states.push(s),
    timers: { set: timers.set, clear: timers.clear },
    ...(minLength === undefined ? {} : { minLength }),
  });
  return { controller, timers, calls, states };
}

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("search controller", () => {
  it("waits 400 ms after the last keystroke", () => {
    const { controller, timers, calls } = setup();
    controller.input("par");
    controller.input("pari");
    expect(timers.count()).toBe(1);
    expect(timers.lastDelay()).toBe(400);
    expect(calls).toHaveLength(0);
    timers.fire();
    expect(calls.map((c) => c.query)).toEqual(["pari"]);
  });

  it("does not search below the minimum length, and goes idle", () => {
    const { controller, timers, calls, states } = setup();
    controller.input("pa");
    expect(timers.count()).toBe(0);
    expect(calls).toHaveLength(0);
    expect(last(states)).toEqual({ status: "idle" });
  });

  it("reports loading, then results", async () => {
    const { controller, timers, calls, states } = setup();
    controller.input("paris");
    timers.fire();
    expect(last(states)).toEqual({ status: "loading", query: "paris" });
    calls[0].resolve([PARIS]);
    await tick();
    expect(last(states)).toEqual({ status: "results", query: "paris", results: [PARIS] });
  });

  it("reports empty for no matches and error for a failure", async () => {
    const { controller, timers, calls, states } = setup();
    controller.input("zzzz");
    timers.fire();
    calls[0].resolve([]);
    await tick();
    expect(last(states)).toEqual({ status: "empty", query: "zzzz" });
    controller.input("boom");
    timers.fire();
    calls[1].reject(new Error("HTTP 500"));
    await tick();
    expect(last(states)).toEqual({ status: "error", query: "boom" });
  });

  it("aborts the request in flight when the text changes", async () => {
    const { controller, timers, calls, states } = setup();
    controller.input("paris");
    timers.fire();
    const first = calls[0];
    expect(first.signal.aborted).toBe(false);
    controller.input("parisx");
    expect(first.signal.aborted).toBe(true);
    // The aborted request settling late must not overwrite the state.
    first.reject(new DOMException("aborted", "AbortError"));
    await tick();
    expect(states.some((s) => s.status === "error")).toBe(false);
  });

  it("ignores a late answer from a superseded request", async () => {
    const { controller, timers, calls, states } = setup();
    controller.input("paris");
    timers.fire();
    controller.input("london");
    timers.fire();
    calls[0].resolve([PARIS]);
    await tick();
    expect(last(states)).toEqual({ status: "loading", query: "london" });
  });

  it("submit searches at once, without the wait", () => {
    const { controller, timers, calls } = setup();
    controller.input("paris");
    controller.submit("paris");
    expect(timers.count()).toBe(0);
    expect(calls.map((c) => c.query)).toEqual(["paris"]);
  });

  it("submit with too little text asks for nothing", () => {
    const { controller, calls } = setup();
    controller.submit("  ");
    expect(calls).toHaveLength(0);
  });

  it("cancel aborts, clears the timer and returns to idle", () => {
    const { controller, timers, calls, states } = setup();
    controller.input("paris");
    timers.fire();
    controller.input("parisx");
    controller.cancel();
    expect(calls[0].signal.aborted).toBe(true);
    expect(timers.count()).toBe(0);
    expect(last(states)).toEqual({ status: "idle" });
  });

  it("dispose stops everything without reporting", () => {
    const { controller, timers, calls, states } = setup();
    controller.input("paris");
    timers.fire();
    const seen = states.length;
    controller.dispose();
    expect(calls[0].signal.aborted).toBe(true);
    expect(states).toHaveLength(seen);
    controller.input("again");
    expect(timers.count()).toBe(0);
  });
});
