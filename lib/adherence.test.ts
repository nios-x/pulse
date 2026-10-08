import { describe, expect, it } from "vitest";
import { istDateTime } from "@/lib/dates";
import { adherence, doseGrid, doseStatus, dueToday, missedSinceYesterday } from "./adherence";

const clock = { today: "2026-10-08", nowMinutes: 13 * 60 }; // 1 pm
const metformin = {
  id: "m1",
  times: ["08:00", "20:00"],
  active: true,
  createdAt: istDateTime("2026-10-01", "07:00"),
};

describe("doseStatus", () => {
  it("a ticked dose is taken whenever it was ticked", () => {
    expect(doseStatus({ date: "2026-10-07", slot: "20:00", taken: true, clock })).toBe("taken");
  });
  it("a dose not ticked by the end of its day is missed", () => {
    expect(doseStatus({ date: "2026-10-07", slot: "20:00", taken: false, clock })).toBe("missed");
  });
  it("today's past dose is due, not missed, until the day ends", () => {
    expect(doseStatus({ date: "2026-10-08", slot: "08:00", taken: false, clock })).toBe("due");
  });
  it("a dose within the next hour is already due", () => {
    expect(doseStatus({ date: "2026-10-08", slot: "14:00", taken: false, clock })).toBe("due");
    expect(doseStatus({ date: "2026-10-08", slot: "14:01", taken: false, clock })).toBe("upcoming");
  });
});

describe("doseGrid", () => {
  it("marks days before the medicine was added as none", () => {
    const med = { ...metformin, createdAt: istDateTime("2026-10-07", "12:00") };
    const grid = doseGrid(med, [], ["2026-10-06", "2026-10-07", "2026-10-08"], clock);
    expect(grid.map((r) => r.cells.map((c) => c.status))).toEqual([
      ["none", "missed", "due"], // 08:00: counted from the day it was added
      ["none", "missed", "upcoming"], // 20:00
    ]);
  });
});

describe("adherence", () => {
  it("counts taken over taken + missed and ignores today's open doses", () => {
    const logs = [
      { medicationId: "m1", date: "2026-10-06", slot: "08:00" },
      { medicationId: "m1", date: "2026-10-06", slot: "20:00" },
      { medicationId: "m1", date: "2026-10-07", slot: "08:00" },
      { medicationId: "m1", date: "2026-10-08", slot: "08:00" },
    ];
    // 06: 2 taken, 07: 1 taken 1 missed, 08: 1 taken (20:00 still upcoming)
    expect(adherence([metformin], logs, "2026-10-06", "2026-10-08", clock)).toEqual({
      taken: 4,
      missed: 1,
      percent: 80,
    });
  });
  it("is null with nothing to count", () => {
    expect(adherence([], [], "2026-10-06", "2026-10-08", clock).percent).toBeNull();
  });
});

describe("dueToday", () => {
  it("lists today's doses whose time has come, with taken state", () => {
    const logs = [{ medicationId: "m1", date: "2026-10-08", slot: "08:00" }];
    expect(dueToday([metformin], logs, clock)).toEqual([
      { medicationId: "m1", date: "2026-10-08", slot: "08:00", taken: true },
    ]);
    expect(dueToday([metformin], logs, { ...clock, nowMinutes: 19 * 60 + 30 })).toHaveLength(2);
  });
  it("skips stopped medicines", () => {
    expect(dueToday([{ ...metformin, active: false }], [], clock)).toEqual([]);
  });
});

describe("missedSinceYesterday", () => {
  it("counts yesterday's untaken doses and today's overdue ones", () => {
    const late = { ...clock, nowMinutes: 10 * 60 + 30 };
    // yesterday 08:00 + 20:00 missed, today 08:00 is 2.5 h overdue
    expect(missedSinceYesterday([metformin], [], late)).toBe(3);
    // today's 08:00 is only 1.5 h overdue at 9:30
    expect(missedSinceYesterday([metformin], [], { ...clock, nowMinutes: 9 * 60 + 30 })).toBe(2);
  });
});
