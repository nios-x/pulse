import { describe, expect, it } from "vitest";
import { frequencyToTimes, SAMPLE_SCAN, toReviewed } from "./prescription";

describe("prescription parsing", () => {
  it("maps Indian dosing patterns to times", () => {
    expect(frequencyToTimes("1-0-1")).toEqual(["08:00", "20:00"]);
    expect(frequencyToTimes("1-1-1")).toEqual(["08:00", "14:00", "20:00"]);
    expect(frequencyToTimes("0-0-1", "at bedtime")).toEqual(["21:30"]);
    expect(frequencyToTimes("BD")).toEqual(["08:00", "20:00"]);
    expect(frequencyToTimes("OD", "at night")).toEqual(["21:00"]);
    expect(frequencyToTimes("SOS")).toEqual([]);
    expect(frequencyToTimes(null)).toEqual([]);
  });
  it("cleans names and finds generics", () => {
    const r = toReviewed(SAMPLE_SCAN);
    expect(r[0]).toMatchObject({ name: "Dolo", genericName: "Paracetamol", times: ["08:00", "14:00", "20:00"], known: true });
    expect(r[1].genericName).toBe("Pantoprazole");
  });
});
