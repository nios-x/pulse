import { describe, expect, it } from "vitest";
import { addDays, ageFrom, fromIst, istDate, istTime, relativeDay } from "./dates";

describe("India time", () => {
  it("converts across midnight", () => {
    const d = new Date("2026-10-08T19:00:00Z"); // 00:30 IST on the 9th
    expect(istDate(d)).toBe("2026-10-09");
    expect(istTime(d)).toBe("00:30");
    expect(fromIst("2026-10-09", "00:30").toISOString()).toBe("2026-10-08T19:00:00.000Z");
  });
  it("does date maths", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(ageFrom("1958-03-12", "2026-10-08")).toBe(68);
    expect(ageFrom("1958-11-12", "2026-10-08")).toBe(67);
    expect(relativeDay("2026-10-09", "2026-10-08")).toBe("tomorrow");
  });
});
