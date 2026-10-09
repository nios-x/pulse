import { describe, expect, it } from "vitest";
import { adherence, doseState, frequencyLabel, groupBySlot, refillStatus, scheduleFor, slotOf } from "./meds";

const med = (over: Partial<Parameters<typeof scheduleFor>[0][number]> = {}) => ({
  id: "med1",
  memberId: "m1",
  times: ["08:00", "20:00"],
  startDate: "2026-10-01",
  endDate: null,
  active: true,
  ...over,
});

describe("medicine schedule", () => {
  it("groups times into morning, afternoon and night", () => {
    expect(slotOf("06:30")).toBe("morning");
    expect(slotOf("13:00")).toBe("afternoon");
    expect(slotOf("21:00")).toBe("night");
    const groups = groupBySlot(scheduleFor([med({ times: ["14:00", "08:00", "21:00"] })], "2026-10-08"));
    expect(groups.morning).toHaveLength(1);
    expect(groups.afternoon).toHaveLength(1);
    expect(groups.night).toHaveLength(1);
  });

  it("respects start, end and active", () => {
    expect(scheduleFor([med()], "2026-09-30")).toHaveLength(0);
    expect(scheduleFor([med({ endDate: "2026-10-05" })], "2026-10-06")).toHaveLength(0);
    expect(scheduleFor([med({ active: false })], "2026-10-08")).toHaveLength(0);
  });

  it("works out due, missed and upcoming", () => {
    const now = { date: "2026-10-08", time: "09:00" };
    expect(doseState({ date: "2026-10-08", time: "08:00" }, null, now)).toBe("due");
    expect(doseState({ date: "2026-10-08", time: "20:00" }, null, now)).toBe("upcoming");
    expect(doseState({ date: "2026-10-08", time: "06:00" }, null, now)).toBe("missed");
    expect(doseState({ date: "2026-10-07", time: "20:00" }, null, now)).toBe("missed");
    expect(doseState({ date: "2026-10-07", time: "20:00" }, "taken", now)).toBe("taken");
    expect(doseState({ date: "2026-10-08", time: "09:30" }, null, now)).toBe("due");
  });

  it("scores adherence over past doses only", () => {
    const now = { date: "2026-10-08", time: "12:00" };
    const logs = [
      { medicationId: "med1", date: "2026-10-07", time: "08:00", status: "taken" as const },
      { medicationId: "med1", date: "2026-10-07", time: "20:00", status: "taken" as const },
      { medicationId: "med1", date: "2026-10-08", time: "08:00", status: "taken" as const },
    ];
    const res = adherence([med({ startDate: "2026-10-07" })], logs, now, 2);
    // 07: 2 doses, 08: morning only (night is upcoming)
    expect(res).toEqual({ taken: 3, due: 3, percent: 100 });
    const res2 = adherence([med({ startDate: "2026-10-07" })], logs.slice(0, 1), now, 2);
    expect(res2.percent).toBe(33);
  });

  it("flags refills", () => {
    expect(refillStatus({ pillsLeft: 30, refillAt: 7, times: ["08:00"] })).toEqual({ status: "ok", daysLeft: 30 });
    expect(refillStatus({ pillsLeft: 6, refillAt: 7, times: ["08:00", "20:00"] })).toEqual({ status: "soon", daysLeft: 3 });
    expect(refillStatus({ pillsLeft: 0, refillAt: 7, times: ["08:00"] }).status).toBe("out");
    expect(refillStatus({ pillsLeft: null, refillAt: 7, times: ["08:00"] }).status).toBe("unknown");
  });

  it("describes frequency in plain words", () => {
    expect(frequencyLabel(["21:00"])).toBe("Once every night");
    expect(frequencyLabel(["08:00", "20:00"])).toBe("Twice a day");
  });
});
