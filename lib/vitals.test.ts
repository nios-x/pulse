import { describe, expect, it } from "vitest";
import { ageIn, bpStatus, glucoseStatus, refillStatus } from "@/lib/vitals";

const limits = { glucoseLow: 70, glucoseHigh: 300 };

describe("glucoseStatus", () => {
  it("labels fasting readings", () => {
    expect(glucoseStatus(112, "fasting", limits)).toEqual({ tone: "ok", label: "inRange" });
    expect(glucoseStatus(150, "fasting", limits)).toEqual({ tone: "watch", label: "aboveTarget" });
    expect(glucoseStatus(210, "fasting", limits)).toEqual({ tone: "alert", label: "high" });
  });
  it("is kinder after a meal", () => {
    expect(glucoseStatus(170, "after_meal", limits).tone).toBe("ok");
  });
  it("uses the patient's own limits first", () => {
    expect(glucoseStatus(65, "fasting", limits)).toEqual({ tone: "alert", label: "low" });
    expect(glucoseStatus(240, "after_meal", { glucoseLow: 70, glucoseHigh: 230 }).label).toBe("high");
  });
});

describe("bpStatus", () => {
  it("follows the home-monitor bands", () => {
    expect(bpStatus(116, 76).label).toBe("normal");
    expect(bpStatus(128, 82).label).toBe("slightlyHigh");
    expect(bpStatus(150, 95)).toEqual({ tone: "alert", label: "high" });
    expect(bpStatus(185, 100).label).toBe("veryHigh");
    expect(bpStatus(85, 55).label).toBe("low");
  });
});

describe("helpers", () => {
  it("works out age and refills", () => {
    expect(ageIn(1964, "2026-10-09")).toBe(62);
    expect(ageIn(null, "2026-10-09")).toBeNull();
    expect(refillStatus(9, 2)).toEqual({ days: 4, tone: "watch" });
    expect(refillStatus(3, 1).tone).toBe("alert");
    expect(refillStatus(40, 1).tone).toBe("ok");
  });
});
