import { describe, expect, it } from "bun:test";
import { HoverStore } from "./hover.ts";

describe("HoverStore", () => {
  it("starts empty and remembers where a change came from", () => {
    const store = new HoverStore();
    expect(store.id).toBeNull();
    store.set("CON:Ori", "canvas");
    expect(store.id).toBe("CON:Ori");
    expect(store.source).toBe("canvas");
    store.set("CON:Ori", "list");
    expect(store.source).toBe("canvas");
  });

  it("notifies only when the id changes", () => {
    const store = new HoverStore();
    let calls = 0;
    const off = store.subscribe(() => {
      calls += 1;
    });
    store.set("CON:Ori", "canvas");
    store.set("CON:Ori", "canvas");
    store.set("CON:Cru", "list");
    store.set(null, "list");
    store.set(null, "canvas");
    expect(calls).toBe(3);
    off();
    store.set("CON:Ori", "canvas");
    expect(calls).toBe(3);
  });

  it("clears only the id it is asked about", () => {
    const store = new HoverStore();
    store.set("CON:Ori", "list");
    store.clear("CON:Cru");
    expect(store.id).toBe("CON:Ori");
    store.clear("CON:Ori");
    expect(store.id).toBeNull();
  });
});
