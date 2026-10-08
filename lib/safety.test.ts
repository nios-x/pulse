import { describe, expect, it } from "vitest";
import {
  evaluateGlucose,
  evaluateMissedDoses,
  evaluateNoLogs,
  moodOutcome,
  SAFETY_COPY,
  safetyText,
  scoreMoodCheck,
} from "./safety";

const patient = { glucoseLow: 70, glucoseHigh: 300 };

describe("evaluateGlucose", () => {
  it.each([
    [45, "glucose_very_low", "urgent"],
    [53, "glucose_very_low", "urgent"],
    [54, "glucose_low", "warning"],
    [69, "glucose_low", "warning"],
    [300, "glucose_high", "warning"],
    [320, "glucose_high", "warning"],
    [399, "glucose_high", "warning"],
    [400, "glucose_very_high", "urgent"],
    [520, "glucose_very_high", "urgent"],
  ])("%i mg/dL -> %s (%s)", (mgdl, kind, severity) => {
    expect(evaluateGlucose(mgdl, patient)).toEqual({ kind, severity });
  });

  it.each([70, 120, 180, 299])("%i mg/dL is in range", (mgdl) => {
    expect(evaluateGlucose(mgdl, patient)).toBeNull();
  });

  it("uses the patient's own limits but never moves the urgent ones", () => {
    const strict = { glucoseLow: 80, glucoseHigh: 250 };
    expect(evaluateGlucose(75, strict)?.kind).toBe("glucose_low");
    expect(evaluateGlucose(260, strict)?.kind).toBe("glucose_high");
    const loose = { glucoseLow: 50, glucoseHigh: 450 };
    expect(evaluateGlucose(53, loose)?.kind).toBe("glucose_very_low");
    expect(evaluateGlucose(400, loose)?.kind).toBe("glucose_very_high");
  });
});

describe("caregiver rules", () => {
  it("missed doses: 3 or more since yesterday", () => {
    expect(evaluateMissedDoses(2)).toBeNull();
    expect(evaluateMissedDoses(3)).toEqual({ kind: "missed_doses", count: 3 });
  });

  it("no logs for 3 days", () => {
    const now = new Date("2026-10-08T12:00:00Z");
    const created = new Date("2026-09-01T00:00:00Z");
    expect(evaluateNoLogs(new Date("2026-10-06T12:00:00Z"), created, now)).toBeNull();
    expect(evaluateNoLogs(new Date("2026-10-05T12:00:00Z"), created, now)).toEqual({ kind: "no_logs", days: 3 });
    // A profile made yesterday with no logs yet is not "silent for 3 days".
    expect(evaluateNoLogs(null, new Date("2026-10-07T12:00:00Z"), now)).toBeNull();
  });
});

describe("weekly check", () => {
  it("asks the follow-up at a score of 3 or more", () => {
    expect(scoreMoodCheck(1, 1)).toEqual({ score: 2, needsFollowUp: false });
    expect(scoreMoodCheck(2, 1)).toEqual({ score: 3, needsFollowUp: true });
  });

  it("a yes to the follow-up opens the crisis screen", () => {
    expect(moodOutcome(2, null)).toBe("ok");
    expect(moodOutcome(4, false)).toBe("support");
    expect(moodOutcome(4, true)).toBe("crisis");
  });
});

describe("copy", () => {
  it("every message exists in English and Hindi", () => {
    for (const copy of Object.values(SAFETY_COPY)) {
      expect(copy.en.length).toBeGreaterThan(0);
      expect(copy.hi.length).toBeGreaterThan(0);
    }
  });

  it("the urgent messages point to 108 and never mention a dose", () => {
    for (const key of ["glucose_very_low", "glucose_very_high"] as const) {
      for (const locale of ["en", "hi"] as const) {
        expect(SAFETY_COPY[key][locale]).toContain("108");
        expect(SAFETY_COPY[key][locale]).not.toMatch(/\d+\s*(mg|unit|tablet|गोली)/i);
      }
    }
  });

  it("fills names into caregiver messages", () => {
    expect(safetyText("missed_doses", "en", { name: "Papa", count: 3 })).toBe("Papa missed 3 doses since yesterday.");
  });
});
