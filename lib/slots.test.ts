import { describe, expect, it } from "vitest";
import { isBookable, slotsFor } from "./slots";

const hours = { "1": ["10:00", "11:00"] as [string, string], "0": null };

describe("doctor slots", () => {
  it("splits working hours into slots", () => {
    // 2026-10-12 is a Monday
    const s = slotsFor(hours, 20, "2026-10-12", [], { date: "2026-10-01", time: "09:00" });
    expect(s.map((x) => x.time)).toEqual(["10:00", "10:20", "10:40"]);
    expect(s.every((x) => x.available)).toBe(true);
  });
  it("blocks booked, past and closed days", () => {
    expect(slotsFor(hours, 20, "2026-10-11", [], { date: "2026-10-01", time: "09:00" })).toEqual([]); // Sunday
    const s = slotsFor(hours, 20, "2026-10-12", ["10:20"], { date: "2026-10-12", time: "09:55" });
    expect(s.map((x) => x.available)).toEqual([false, false, true]);
    expect(isBookable(hours, 20, "2026-10-12", "10:40", [], { date: "2026-10-12", time: "09:00" })).toBe(true);
    expect(isBookable(hours, 20, "2026-10-12", "10:05", [], { date: "2026-10-12", time: "09:00" })).toBe(false);
  });
});
