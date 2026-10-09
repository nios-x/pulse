import { describe, expect, it } from "vitest";
import { classifyPhenotype, cycleFlags, cycleStats, dailyProtocol, mealFeedback, type OnboardingAnswers } from "./pcos";
import { recommend } from "./recommendations";

const answers: OnboardingAnswers = { diagnosedWhen: "1_3_years", wasBirthControl: false, weightDistribution: "even", concerns: [], stressLevel: "managing", sleepPattern: "before_midnight", eatingPattern: "regular_3meals", topPriority: "periods" };

describe("PCOS care", () => {
  it("lets the doctor's prescription decide the phenotype first", () => {
    expect(classifyPhenotype(answers, [{ name: "Metformin", dose: "500 mg", frequency: "night" }])).toBe("insulin_resistant");
    expect(classifyPhenotype({ ...answers, wasBirthControl: true }, [{ name: "Spironolactone", dose: "25 mg", frequency: "morning" }])).toBe("adrenal_stress");
    expect(classifyPhenotype({ ...answers, wasBirthControl: true }, [])).toBe("post_pill");
    expect(classifyPhenotype({ ...answers, concerns: ["bloating"] }, [])).toBe("inflammatory");
    expect(dailyProtocol("adrenal_stress").map((a) => a.key)).toContain("breathing_5min");
  });
  it("tracks cycles without 28-day assumptions", () => {
    const s = cycleStats(["2026-06-01", "2026-07-08", "2026-08-20", "2026-09-27"], "2026-10-09");
    expect(s.lengths).toEqual([37, 43, 38]);
    expect(s.regular).toBe(false);
    expect(s.daysSinceLast).toBe(12);
    expect(cycleFlags(s)).toEqual([]);
    expect(cycleFlags(cycleStats(["2026-01-01", "2026-03-01"], "2026-10-09")).length).toBe(2);
  });
  it("nudges carb pairing", () => {
    expect(mealFeedback(["rice"]).balanced).toBe(false);
    expect(mealFeedback(["rice", "dal", "sabzi"]).balanced).toBe(true);
  });
});

describe("recommendations", () => {
  it("personalizes by condition and age", () => {
    const keys = recommend({ age: 68, sex: "male", conditions: [{ name: "Type 2 diabetes" }, { name: "High blood pressure" }], latest: { bpSys: 150 }, hasMeds: true }).map((r) => r.key);
    expect(keys).toContain("low_salt");
    expect(keys).toContain("post_meal_walk");
    expect(keys.length).toBeLessThanOrEqual(6);
    const kid = recommend({ age: 9, sex: "male", conditions: [{ name: "Mild asthma" }], latest: {}, hasMeds: true });
    expect(kid.find((r) => r.key === "daily_walk")?.title).toBe("An hour of active play");
    expect(recommend({ age: 30, sex: "female", conditions: [], latest: {}, pcos: "insulin_resistant", hasMeds: false }).map((r) => r.key)).toContain("protein_breakfast");
  });
});
