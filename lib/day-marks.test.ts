import { describe, expect, it } from "vitest";
import { istDateTime } from "@/lib/dates";
import { addMonths, markDay, markMonth, monthBounds, parseMonth } from "@/lib/day-marks";
import type { ReadingIn } from "@/lib/insights";

const limits = { glucoseLow: 70, glucoseHigh: 300 };
const today = "2026-10-09";
const reading = (mgdl: number, context: ReadingIn["context"] = "fasting", date = "2026-10-08"): ReadingIn => ({
  mgdl,
  context,
  measuredAt: istDateTime(date, "08:00"),
});
const day = (readings: ReadingIn[], doses: { taken: number; missed: number } | null = null, walked = false) =>
  markDay("2026-10-08", today, { readings, doses, walked }, limits);

describe("markDay", () => {
  it("marks a low reading as alert, even with everything else fine", () => {
    const d = day([reading(62), reading(110)], { taken: 2, missed: 0 });
    expect(d.mark).toBe("alert");
    expect(d.reasons).toEqual([{ kind: "low", mgdl: 62 }]);
  });

  it("names the highest high reading and any missed doses", () => {
    const d = day([reading(320, "after_meal"), reading(310, "random")], { taken: 1, missed: 1 });
    expect(d.mark).toBe("alert");
    expect(d.reasons).toEqual([
      { kind: "high", mgdl: 320 },
      { kind: "missed", count: 1 },
    ]);
  });

  it("marks a missed dose as watch", () => {
    expect(day([reading(100)], { taken: 1, missed: 1 }).mark).toBe("watch");
  });

  it("marks a reading above target as watch", () => {
    const d = day([reading(150)]);
    expect(d.mark).toBe("watch");
    expect(d.reasons).toEqual([{ kind: "aboveTarget", count: 1 }]);
  });

  it("marks in-range readings and taken doses as good, with the walk", () => {
    const d = day([reading(100)], { taken: 2, missed: 0 }, true);
    expect(d.mark).toBe("good");
    expect(d.reasons).toEqual([
      { kind: "inRange", count: 1 },
      { kind: "taken", count: 2 },
      { kind: "walked" },
    ]);
  });

  it("doesn't call a day good on a walk alone", () => {
    expect(day([], null, true)).toMatchObject({ mark: "empty", reasons: [{ kind: "walked" }] });
  });

  it("leaves future days unmarked", () => {
    expect(markDay("2026-10-10", today, { readings: [reading(40)], doses: null, walked: true }, limits).mark).toBe(
      "future"
    );
  });
});

describe("months", () => {
  it("shifts across years and finds the last day", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("falls back to this month for bad or future input", () => {
    expect(parseMonth("2026-09", today)).toBe("2026-09");
    expect(parseMonth("2026-11", today)).toBe("2026-10");
    expect(parseMonth("2026-13", today)).toBe("2026-10");
    expect(parseMonth(["2026-09"], today)).toBe("2026-10");
  });

  it("pads October 2026 to start on a Thursday", () => {
    const { weeks, days } = markMonth("2026-10", today, { readings: [], doses: () => null, walkedDates: new Set() }, limits);
    expect(days).toHaveLength(31);
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0][4]?.date).toBe("2026-10-01");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("groups readings by India date", () => {
    const late = { mgdl: 50, context: "random" as const, measuredAt: new Date("2026-10-04T20:00:00Z") }; // 5 Oct 01:30 IST
    const { days } = markMonth("2026-10", today, { readings: [late], doses: () => null, walkedDates: new Set() }, limits);
    expect(days.find((d) => d.date === "2026-10-05")?.mark).toBe("alert");
    expect(days.find((d) => d.date === "2026-10-04")?.mark).toBe("empty");
  });
});
