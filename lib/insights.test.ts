import { describe, expect, it } from "vitest";
import { addDays, istDateTime } from "@/lib/dates";
import {
  afterDinnerReadingsNeeded,
  fastingSeries,
  fastingTrend,
  mealEffect,
  medicineEffect,
  walkEffect,
  weekWindows,
  type MealIn,
  type ReadingIn,
} from "./insights";

const today = "2026-10-08";
const day = (i: number) => addDays(today, -i);

function dinnersAndReadings(days: number, rice: (i: number) => boolean, riceSugar = 212, rotiSugar = 168) {
  const meals: MealIn[] = [];
  const readings: ReadingIn[] = [];
  for (let i = 0; i < days; i++) {
    const r = rice(i);
    meals.push({ slot: "dinner", items: r ? ["rice", "dal"] : ["roti", "dal", "sabzi"], eatenAt: istDateTime(day(i), "20:30") });
    readings.push({ mgdl: r ? riceSugar : rotiSugar, context: "after_meal", measuredAt: istDateTime(day(i), "22:30") });
  }
  return { meals, readings };
}

describe("mealEffect", () => {
  it("compares dinners with a high-carb item against those without", () => {
    const { meals, readings } = dinnersAndReadings(8, (i) => i % 2 === 0);
    expect(mealEffect(readings, meals)).toEqual({
      kind: "meal",
      slot: "dinner",
      highItem: "rice",
      lowItem: "roti",
      highAvg: 212,
      lowAvg: 168,
      n: 8,
    });
  });

  it("needs 3 readings in each group", () => {
    const { meals, readings } = dinnersAndReadings(5, (i) => i < 3); // 3 rice, 2 roti
    expect(mealEffect(readings, meals)).toBeNull();
    expect(afterDinnerReadingsNeeded(readings, meals)).toBe(1);
  });

  it("needs a gap of 20 mg/dL", () => {
    const { meals, readings } = dinnersAndReadings(8, (i) => i % 2 === 0, 185, 170);
    expect(mealEffect(readings, meals)).toBeNull();
  });

  it("ignores readings more than 3 hours after the meal", () => {
    const { meals, readings } = dinnersAndReadings(8, (i) => i % 2 === 0);
    const late = readings.map((r) => ({ ...r, measuredAt: new Date(r.measuredAt.getTime() + 2 * 3600_000) }));
    expect(mealEffect(late, meals)).toBeNull();
  });

  it("a new patient needs 3 after-dinner readings", () => {
    expect(afterDinnerReadingsNeeded([], [])).toBe(3);
  });
});

describe("walkEffect", () => {
  const checkins = Array.from({ length: 8 }, (_, i) => ({ date: day(i + 1), walked: i % 2 === 0 }));
  const readings: ReadingIn[] = checkins.map((c) => ({
    mgdl: c.walked ? 118 : 140,
    context: "fasting",
    measuredAt: istDateTime(addDays(c.date, 1), "07:30"),
  }));

  it("compares next-morning fasting after walking vs not", () => {
    expect(walkEffect(readings, checkins)).toEqual({ kind: "walk", walkedAvg: 118, restAvg: 140, n: 8 });
  });

  it("is null with too few mornings", () => {
    expect(walkEffect(readings.slice(0, 4), checkins)).toBeNull();
  });
});

describe("medicineEffect", () => {
  const weeks = weekWindows(today, 2).map((w, i) => ({ ...w, percent: i === 0 ? 95 : 60 }));
  const readings: ReadingIn[] = Array.from({ length: 14 }, (_, i) => ({
    mgdl: i < 7 ? 125 : 150,
    context: "fasting",
    measuredAt: istDateTime(day(i), "07:30"),
  }));

  it("compares fasting in weeks with 80%+ adherence against weeks below", () => {
    expect(medicineEffect(readings, weeks)).toEqual({ kind: "medicine", goodAvg: 125, lowAvg: 150, n: 14 });
  });

  it("is null when every week looks the same", () => {
    expect(medicineEffect(readings, weeks.map((w) => ({ ...w, percent: 90 })))).toBeNull();
  });
});

describe("fastingTrend", () => {
  const readings: ReadingIn[] = Array.from({ length: 14 }, (_, i) => ({
    mgdl: i < 7 ? 130 : 142,
    context: "fasting",
    measuredAt: istDateTime(day(i), "07:30"),
  }));

  it("compares this week with last week", () => {
    expect(fastingTrend(readings, today)).toEqual({ kind: "trend", thisAvg: 130, lastAvg: 142, direction: "down" });
  });

  it("is null without two weeks of readings", () => {
    expect(fastingTrend(readings.slice(0, 7), today)).toBeNull();
  });
});

describe("fastingSeries", () => {
  it("averages each day and leaves gaps as null", () => {
    const readings: ReadingIn[] = [
      { mgdl: 120, context: "fasting", measuredAt: istDateTime(today, "07:00") },
      { mgdl: 130, context: "fasting", measuredAt: istDateTime(today, "08:00") },
      { mgdl: 200, context: "after_meal", measuredAt: istDateTime(today, "22:00") },
    ];
    expect(fastingSeries(readings, day(1), today)).toEqual([
      { date: day(1), mgdl: null },
      { date: today, mgdl: 125 },
    ]);
  });
});
