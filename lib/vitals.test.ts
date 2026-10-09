import { describe, expect, it } from "vitest";
import { bmi, classify, formatReading, isAlarming } from "./vitals";

describe("vitals", () => {
  it("labels blood pressure", () => {
    expect(classify({ kind: "bp", value: 116, value2: 76 }).status).toBe("normal");
    expect(classify({ kind: "bp", value: 128, value2: 82 })).toEqual({ status: "watch", label: "Elevated" });
    expect(classify({ kind: "bp", value: 150, value2: 95 }).label).toBe("High");
    expect(classify({ kind: "bp", value: 85, value2: 55 }).status).toBe("low");
  });

  it("labels sugar by context", () => {
    expect(classify({ kind: "sugar", value: 110, context: "fasting" }).status).toBe("watch");
    expect(classify({ kind: "sugar", value: 110, context: "after_meal" }).status).toBe("normal");
    expect(classify({ kind: "sugar", value: 210, context: "after_meal" }).status).toBe("high");
    expect(classify({ kind: "sugar", value: 62, context: "random" }).status).toBe("low");
  });

  it("formats and alarms", () => {
    expect(formatReading({ kind: "bp", value: 150, value2: 95 })).toBe("150/95");
    expect(formatReading({ kind: "weight", value: 72.44 })).toBe("72.4");
    expect(isAlarming({ kind: "bp", value: 150, value2: 95 })).toBe(true);
    expect(isAlarming({ kind: "bp", value: 125, value2: 80 })).toBe(false);
    expect(isAlarming({ kind: "spo2", value: 90 })).toBe(true);
  });

  it("computes BMI", () => {
    expect(bmi(70, 170)).toBe(24.2);
    expect(bmi(null, 170)).toBeNull();
  });
});
