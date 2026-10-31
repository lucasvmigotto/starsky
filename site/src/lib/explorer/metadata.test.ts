import { describe, expect, it } from "bun:test";
import { IDLE_MS, MetadataMachine, formatMoment } from "./metadata.ts";

function setup() {
  const clock = { t: 0 };
  const machine = new MetadataMachine({ now: () => clock.t });
  return { clock, machine };
}

describe("MetadataMachine", () => {
  it("starts compact: only the one line shows on load", () => {
    const { machine } = setup();
    expect(machine.mode).toBe("compact");
    expect(machine.msUntilCompact()).toBeNull();
  });

  it("goes compact after 2500 ms without activity, not before", () => {
    const { clock, machine } = setup();
    machine.activity();
    expect(IDLE_MS).toBe(2500);
    clock.t = 2499;
    expect(machine.tick()).toBe(false);
    expect(machine.mode).toBe("expanded");
    clock.t = 2500;
    expect(machine.tick()).toBe(true);
    expect(machine.mode).toBe("compact");
  });

  it("activity restarts the idle time", () => {
    const { clock, machine } = setup();
    machine.activity();
    clock.t = 2000;
    machine.activity();
    clock.t = 4000;
    machine.tick();
    expect(machine.mode).toBe("expanded");
    expect(machine.msUntilCompact()).toBe(500);
    clock.t = 4500;
    machine.tick();
    expect(machine.mode).toBe("compact");
  });

  it("activity while compact expands", () => {
    const { machine } = setup();
    expect(machine.mode).toBe("compact");
    expect(machine.activity()).toBe(true);
    expect(machine.mode).toBe("expanded");
  });

  it("reports no change for activity while already expanded", () => {
    const { machine } = setup();
    machine.activity();
    expect(machine.activity()).toBe(false);
  });

  it("stays pinned through activity and idle time", () => {
    const { clock, machine } = setup();
    machine.pin();
    expect(machine.mode).toBe("pinned");
    clock.t = 60_000;
    expect(machine.tick()).toBe(false);
    machine.activity();
    expect(machine.mode).toBe("pinned");
  });

  it("unpinning expands and starts the idle time afresh", () => {
    const { clock, machine } = setup();
    machine.pin();
    clock.t = 10_000;
    machine.unpin();
    expect(machine.mode).toBe("expanded");
    clock.t = 12_499;
    machine.tick();
    expect(machine.mode).toBe("expanded");
    clock.t = 12_500;
    machine.tick();
    expect(machine.mode).toBe("compact");
  });

  it("pins from compact too", () => {
    const { clock, machine } = setup();
    clock.t = 3000;
    machine.tick();
    machine.togglePin();
    expect(machine.mode).toBe("pinned");
    machine.togglePin();
    expect(machine.mode).toBe("expanded");
  });

  it("has no time left to wait unless expanded", () => {
    const { clock, machine } = setup();
    machine.activity();
    expect(machine.msUntilCompact()).toBe(2500);
    machine.pin();
    expect(machine.msUntilCompact()).toBeNull();
    machine.unpin();
    clock.t = 5000;
    machine.tick();
    expect(machine.msUntilCompact()).toBeNull();
  });

  it("tells subscribers only when the mode changes", () => {
    const { clock, machine } = setup();
    let calls = 0;
    const off = machine.subscribe(() => {
      calls++;
    });
    machine.activity();
    expect(calls).toBe(1);
    machine.activity();
    expect(calls).toBe(1);
    clock.t = 3000;
    machine.tick();
    expect(calls).toBe(2);
    machine.pin();
    expect(calls).toBe(3);
    off();
    machine.unpin();
    expect(calls).toBe(3);
  });
});

describe("formatMoment", () => {
  const base = {
    lat: 35.6895,
    lon: 139.6917,
    place: "Tokyo",
    title: "First night",
    when_utc: "1998-11-17T02:17:00Z",
    tz: "Asia/Tokyo",
  };

  it("shows the local date, time and zone derived from when_utc and tz", () => {
    const m = formatMoment(base);
    expect(m.local).toBe("Nov 17, 1998, 11:17 AM GMT+9");
  });

  it("joins title, place and time on one line for the compact form", () => {
    expect(formatMoment(base).compact).toBe("First night · Tokyo · Nov 17, 1998, 11:17 AM GMT+9");
  });

  it("omits the title when it is null", () => {
    const m = formatMoment({ ...base, title: null });
    expect(m.title).toBeNull();
    expect(m.compact).toBe("Tokyo · Nov 17, 1998, 11:17 AM GMT+9");
  });

  it("falls back to coordinates, in the poster's format, when there is no place", () => {
    const m = formatMoment({ ...base, place: null, title: null });
    expect(m.place).toBeNull();
    expect(m.compact).toBe("35.6895°N, 139.6917°E · Nov 17, 1998, 11:17 AM GMT+9");
    expect(m.coords).toBe("35.6895°N, 139.6917°E");
  });

  it("names UTC when the zone is not one it knows", () => {
    expect(formatMoment({ ...base, tz: "Not/AZone" }).local).toBe("Nov 17, 1998, 2:17 AM UTC");
  });

  it("gives the full text a screen reader reads, the same for every mode", () => {
    expect(formatMoment(base).full).toBe(
      "First night, Tokyo, Nov 17, 1998, 11:17 AM GMT+9, 35.6895°N, 139.6917°E",
    );
  });
});
