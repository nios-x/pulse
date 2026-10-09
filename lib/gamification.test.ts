import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { bestStreak, currentStreak, dayComplete, dayXp, levelFor, questsDone, summarize, type DayActivity } from "./gamification";

const good = (date: string): DayActivity => ({ date, dosesDue: 2, dosesTaken: 2, vitals: 1, habits: { water: 8, walk: 10 } });
const meh = (date: string): DayActivity => ({ date, dosesDue: 2, dosesTaken: 1, vitals: 0, habits: { water: 3 } });
const T = "2026-10-09";

describe("quests and streaks", () => {
  it("counts quests only when goals are met", () => {
    expect(questsDone(good(T)).sort()).toEqual(["meds", "vital", "water"]);
    expect(questsDone(meh(T))).toEqual([]);
    expect(questsDone({ date: T, dosesDue: 0, dosesTaken: 0, vitals: 0, habits: { walk: 45, sleep: 8, produce: 5 } }).sort()).toEqual(["produce", "sleep", "walk"]);
    expect(dayComplete(good(T))).toBe(true);
  });

  it("streak ends today, or yesterday while today is in progress", () => {
    const days = new Map([0, 1, 2, 3].map((i) => [addDays(T, -i), good(addDays(T, -i))]));
    expect(currentStreak(days, T)).toBe(4);
    days.set(T, meh(T));
    expect(currentStreak(days, T)).toBe(3);
    days.set(addDays(T, -2), meh(addDays(T, -2)));
    expect(currentStreak(days, T)).toBe(1);
  });

  it("grace days pause the streak without breaking it", () => {
    const days = new Map([
      [addDays(T, -3), good(addDays(T, -3))],
      [addDays(T, -2), { ...meh(addDays(T, -2)), grace: true }],
      [addDays(T, -1), good(addDays(T, -1))],
      [T, good(T)],
    ]);
    expect(currentStreak(days, T)).toBe(3);
    expect(bestStreak(days)).toBe(3);
  });

  it("awards XP and levels", () => {
    expect(dayXp(good(T))).toBe(30 + 15 + 15 + 2 * 5);
    expect(levelFor(0).name).toBe("Seed");
    expect(levelFor(450)).toMatchObject({ name: "Seedling", level: 3 });
    expect(levelFor(450).xpToNext).toBe(350);
    expect(levelFor(99999).next).toBeNull();
  });

  it("summarizes badges and the fruit basket", () => {
    const list = Array.from({ length: 10 }, (_, i) => good(addDays(T, -i)));
    const s = summarize(list, T);
    expect(s.streak).toBe(10);
    expect(s.badges.find((b) => b.key === "streak_7")?.earned).toBe(true);
    expect(s.badges.find((b) => b.key === "streak_14")?.earned).toBe(false);
    expect(s.badges.find((b) => b.key === "perfect_week")?.earned).toBe(true);
    expect(s.basket.orange).toBe(10);
    expect(s.last7).toHaveLength(7);
    expect(s.weeklyXp).toBe(7 * dayXp(good(T)));
  });
});
