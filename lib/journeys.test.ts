import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import type { DayActivity } from "./gamification";
import { buildJourneys, closestWin, position } from "./journeys";

const T = "2026-10-09";
const day = (i: number, over: Partial<DayActivity> = {}): DayActivity => ({ date: addDays(T, i - 9), dosesDue: 0, dosesTaken: 0, vitals: 0, habits: {}, ...over });

describe("journeys", () => {
  it("adds up each habit and dates the day a milestone was passed", () => {
    const days = Array.from({ length: 10 }, (_, i) => day(i, { habits: { water: 5 } }));
    const water = buildJourneys(days).journeys.find((j) => j.key === "water")!;
    expect(water.value).toBe(50);
    expect(water.valueLabel).toBe("50 glasses");
    expect(water.milestones.find((m) => m.at === 8)!.reachedOn).toBe(days[1].date);
    expect(water.milestones.find((m) => m.at === 40)!.reachedOn).toBe(days[7].date);
    expect(water.milestones.find((m) => m.at === 100)!.reachedOn).toBeNull();
    expect(water.toGo).toBe("50 glasses");
  });

  it("only shows the medicine road when doses were scheduled", () => {
    expect(buildJourneys([day(0)]).journeys.some((j) => j.key === "meds")).toBe(false);
    expect(buildJourneys([day(0, { dosesDue: 2, dosesTaken: 2 })]).journeys.some((j) => j.key === "meds")).toBe(true);
  });

  it("tracks the best streak run, paused by rest days", () => {
    const full = { vitals: 1, habits: { water: 8, walk: 30 } };
    const days = [day(0, full), day(1, full), day(2, { grace: true }), day(3, full), day(4), day(5, full)];
    const streak = buildJourneys(days, 1).journeys.find((j) => j.key === "streak")!;
    expect(streak.value).toBe(3);
    expect(streak.milestones.find((m) => m.at === 3)!.reachedOn).toBe(days[3].date);
    expect(streak.note).toContain("1 day");
  });

  it("lists wins newest first and counts days with any quest", () => {
    const { wins, daysShowingUp } = buildJourneys([day(0, { vitals: 1 }), day(1), day(2, { habits: { produce: 5 } })]);
    expect(wins.map((w) => w.label)).toEqual(["5 servings", "First reading"]);
    expect(daysShowingUp).toBe(2);
  });

  it("places a value between stops and finds the nearest win", () => {
    expect(position([{ at: 0 }, { at: 10 }, { at: 30 }], 20)).toBe(1.5);
    expect(position([{ at: 0 }, { at: 10 }], 99)).toBe(1);
    const { journeys } = buildJourneys([day(0, { habits: { water: 7, walk: 5 } })]);
    expect(closestWin(journeys)?.next.label).toBe("8 glasses");
  });
});
