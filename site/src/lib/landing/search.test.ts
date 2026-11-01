import { describe, expect, it } from "bun:test";
import type { ResolvedPlace } from "../geocode.ts";
import { SEARCH_MIN_INTERVAL_MS, SEARCH_TIMEOUT_MS, type SearchState, createSearchController } from "./search.ts";
import { at } from "../testing.ts";

const PARIS: ResolvedPlace = { lat: 48.85, lon: 2.35, displayName: "Paris, France", short: "Paris, France" };

/** Timers the test fires by hand, and a clock it advances by hand: no real waiting. */
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

function setup() {
  const timers = fakeTimers();
  const deadline = fakeTimers();
  const calls: Call[] = [];
  const states: SearchState[] = [];
  const clock = { t: 10_000 };
  const controller = createSearchController({
    search: (query, signal) =>
      new Promise<ResolvedPlace[]>((resolve, reject) => {
        calls.push({ query, signal, resolve, reject });
      }),
    onState: (s) => states.push(s),
    timers: { set: timers.set, clear: timers.clear },
    deadlineTimers: { set: deadline.set, clear: deadline.clear },
    now: () => clock.t,
  });
  return { controller, timers, deadline, calls, states, clock };
}

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("search controller", () => {
  it("resubmitting the same query while it is fetched sends nothing and keeps the request", () => {
    const { controller, calls } = setup();
    controller.submit("paris");
    controller.submit("Paris ");
    controller.submit("PARIS");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it("resubmitting the same query while it waits its turn sets no second timer", async () => {
    const { controller, timers, calls, clock } = setup();
    controller.submit("london");
    calls[0]?.resolve([PARIS]);
    await tick();
    clock.t += 200;
    controller.submit("paris");
    controller.submit("paris");
    expect(timers.count()).toBe(1);
    timers.fire();
    expect(calls).toHaveLength(2);
  });

  it("the same query can be searched again after a failure", async () => {
    const { controller, calls, clock } = setup();
    controller.submit("paris");
    calls[0]?.reject(new Error("down"));
    await tick();
    clock.t += 2_000;
    controller.submit("paris");
    expect(calls).toHaveLength(2);
  });

  it("typing sends nothing, sets no timer, and goes idle", () => {
    const { controller, timers, calls, states } = setup();
    controller.input();
    controller.input();
    expect(calls).toHaveLength(0);
    expect(timers.count()).toBe(0);
    expect(last(states)).toEqual({ status: "idle" });
  });

  it("typing aborts the request in flight and returns to idle", async () => {
    const { controller, calls, states } = setup();
    controller.submit("paris");
    const first = at(calls, 0);
    expect(first.signal.aborted).toBe(false);
    controller.input();
    expect(first.signal.aborted).toBe(true);
    expect(last(states)).toEqual({ status: "idle" });
    // The aborted request settling late must not overwrite the state.
    first.reject(new DOMException("aborted", "AbortError"));
    await tick();
    expect(last(states)).toEqual({ status: "idle" });
  });

  it("typing closes a stale results list", async () => {
    const { controller, calls, states } = setup();
    controller.submit("paris");
    calls[0]?.resolve([PARIS]);
    await tick();
    expect(last(states)?.status).toBe("results");
    controller.input();
    expect(last(states)).toEqual({ status: "idle" });
  });

  it("submit searches once, reporting loading then results", async () => {
    const { controller, calls, states } = setup();
    controller.submit("  paris ");
    expect(calls.map((c) => c.query)).toEqual(["paris"]);
    expect(last(states)).toEqual({ status: "loading", query: "paris" });
    calls[0]?.resolve([PARIS]);
    await tick();
    expect(last(states)).toEqual({ status: "results", query: "paris", results: [PARIS] });
  });

  it("submit with only spaces asks for nothing", () => {
    const { controller, calls, states } = setup();
    controller.submit("  ");
    expect(calls).toHaveLength(0);
    expect(states).toHaveLength(0);
  });

  it("reports empty for no matches and error for a failure", async () => {
    const { controller, calls, states, clock } = setup();
    controller.submit("zzzz");
    calls[0]?.resolve([]);
    await tick();
    expect(last(states)).toEqual({ status: "empty", query: "zzzz" });
    clock.t += SEARCH_MIN_INTERVAL_MS;
    controller.submit("boom");
    calls[1]?.reject(new Error("HTTP 500"));
    await tick();
    expect(last(states)).toEqual({ status: "error", query: "boom" });
  });

  it("a repeated submit answers from the cache with no request, even inside the window", async () => {
    const { controller, calls, states, timers } = setup();
    controller.submit("Paris");
    calls[0]?.resolve([PARIS]);
    await tick();
    controller.submit(" paris  ");
    expect(calls).toHaveLength(1);
    expect(timers.count()).toBe(0);
    expect(last(states)).toEqual({ status: "results", query: "paris", results: [PARIS] });
  });

  it("caches an empty answer too", async () => {
    const { controller, calls, states } = setup();
    controller.submit("zzzz");
    calls[0]?.resolve([]);
    await tick();
    controller.submit("ZZZZ");
    expect(calls).toHaveLength(1);
    expect(last(states)).toEqual({ status: "empty", query: "ZZZZ" });
  });

  it("does not cache an error: the same query is requested again", async () => {
    const { controller, calls, clock } = setup();
    controller.submit("paris");
    calls[0]?.reject(new Error("HTTP 503"));
    await tick();
    clock.t += SEARCH_MIN_INTERVAL_MS;
    controller.submit("paris");
    expect(calls).toHaveLength(2);
  });

  it("a second submit within a second waits for the rest of the window, and aborts the first", () => {
    const { controller, calls, timers, states, clock } = setup();
    controller.submit("paris");
    clock.t += 300;
    controller.submit("london");
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(calls).toHaveLength(1);
    expect(timers.lastDelay()).toBe(SEARCH_MIN_INTERVAL_MS - 300);
    expect(last(states)).toEqual({ status: "loading", query: "london" });
    clock.t += 700;
    timers.fire();
    expect(calls.map((c) => c.query)).toEqual(["paris", "london"]);
  });

  it("a newer submit supersedes one that is still waiting", () => {
    const { controller, calls, timers, clock } = setup();
    controller.submit("paris");
    clock.t += 100;
    controller.submit("london");
    clock.t += 100;
    controller.submit("rome");
    expect(timers.count()).toBe(1);
    clock.t += 800;
    timers.fire();
    expect(calls.map((c) => c.query)).toEqual(["paris", "rome"]);
  });

  it("typing during the wait cancels it", () => {
    const { controller, calls, timers, states, clock } = setup();
    controller.submit("paris");
    clock.t += 100;
    controller.submit("london");
    controller.input();
    expect(timers.count()).toBe(0);
    expect(last(states)).toEqual({ status: "idle" });
    clock.t += 2000;
    timers.fire();
    expect(calls).toHaveLength(1);
  });

  it("cancel during the wait stops the pending request and goes idle", () => {
    const { controller, calls, timers, states, clock } = setup();
    controller.submit("paris");
    clock.t += 100;
    controller.submit("london");
    controller.cancel();
    expect(timers.count()).toBe(0);
    expect(last(states)).toEqual({ status: "idle" });
    expect(calls).toHaveLength(1);
  });

  it("a late answer from a superseded request is ignored and not cached", async () => {
    const { controller, calls, states, clock } = setup();
    controller.submit("paris");
    clock.t += SEARCH_MIN_INTERVAL_MS;
    controller.submit("london");
    calls[0]?.resolve([PARIS]);
    await tick();
    expect(last(states)).toEqual({ status: "loading", query: "london" });
    clock.t += SEARCH_MIN_INTERVAL_MS;
    controller.submit("paris");
    expect(calls).toHaveLength(3);
  });

  it("dispose stops everything without reporting", () => {
    const { controller, timers, calls, states, clock } = setup();
    controller.submit("paris");
    clock.t += 100;
    controller.submit("london");
    const seen = states.length;
    controller.dispose();
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(timers.count()).toBe(0);
    expect(states).toHaveLength(seen);
    controller.input();
    controller.submit("again");
    expect(calls).toHaveLength(1);
    expect(states).toHaveLength(seen);
  });

  it("gives up on a request that never answers: aborts it and reports an error", async () => {
    const { controller, deadline, calls, states } = setup();
    controller.submit("paris");
    await tick();
    expect(at(calls, 0).signal.aborted).toBe(false);
    expect(deadline.count()).toBe(1);
    expect(deadline.lastDelay()).toBe(SEARCH_TIMEOUT_MS);
    deadline.fire();
    expect(at(calls, 0).signal.aborted).toBe(true);
    expect(last(states)).toEqual({ status: "error", query: "paris" });
    // A late answer from the abandoned request changes nothing.
    at(calls, 0).resolve([PARIS]);
    await tick();
    expect(last(states)).toEqual({ status: "error", query: "paris" });
  });

  it("clears the deadline when the request answers in time", async () => {
    const { controller, deadline, calls, states } = setup();
    controller.submit("paris");
    await tick();
    at(calls, 0).resolve([PARIS]);
    await tick();
    expect(deadline.count()).toBe(0);
    expect(last(states)?.status).toBe("results");
  });

  it("allows the same query again after a timeout", async () => {
    const { controller, deadline, states } = setup();
    controller.submit("paris");
    await tick();
    deadline.fire();
    expect(last(states)?.status).toBe("error");
    controller.submit("paris");
    expect(last(states)).toEqual({ status: "loading", query: "paris" });
  });
});
