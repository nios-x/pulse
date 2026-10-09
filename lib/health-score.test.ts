import { describe, expect, it } from "vitest";
import { improvement, mondayOf, scoreWeek, weeklyScores, type ScoreDay } from "./health-score";
import { addDays } from "./dates";

const day = (date: string, taken: number, inRange: boolean, goals: number, bp: number): ScoreDay => ({
  date, dosesDue: 2, dosesTaken: taken, readings: [{ inRange }], habitGoals: { met: goals, total: 4 }, bpSys: [bp],
});

describe("health score", () => {
  it("weights medicines, readings and habits", () => {
    expect(scoreWeek([day("2026-10-05", 2, true, 4, 120)]).score).toBe(100);
    expect(scoreWeek([day("2026-10-05", 1, false, 2, 150)]).score).toBe(Math.round(0.4 * 50 + 0.35 * 0 + 0.25 * 50));
  });
  it("re-weights when a part has no data", () => {
    expect(scoreWeek([{ date: "2026-10-05", dosesDue: 0, dosesTaken: 0, readings: [], habitGoals: { met: 2, total: 4 } }]).score).toBe(50);
  });
  it("groups by week and compares before and after the plan", () => {
    expect(mondayOf("2026-10-09")).toBe("2026-10-05");
    const days: ScoreDay[] = [];
    for (let i = 0; i < 56; i++) {
      const d = addDays("2026-08-17", i);
      const after = i >= 28;
      days.push(day(d, after ? 2 : 1, after, after ? 4 : 1, after ? 128 : 146));
    }
    const weeks = weeklyScores(days, "2026-09-14");
    expect(weeks).toHaveLength(8);
    const imp = improvement(weeks, "score")!;
    expect(imp.after).toBeGreaterThan(imp.before);
    expect(improvement(weeks, "bpSys")!.change).toBe(-18);
  });
});
