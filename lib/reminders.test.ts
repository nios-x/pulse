import { describe, expect, it } from "vitest";
import { istDateTime } from "@/lib/dates";
import { remindersDue } from "./reminders";

const med = { id: "m1", times: ["08:00", "20:00"], active: true, createdAt: istDateTime("2026-10-01", "07:00") };
const at = (h: number, m = 0) => ({ today: "2026-10-08", nowMinutes: h * 60 + m });

describe("remindersDue", () => {
  it("reminds the patient at the dose time", () => {
    expect(remindersDue([med], [], at(8, 0))).toEqual([
      { medicationId: "m1", date: "2026-10-08", slot: "08:00", kind: "due" },
    ]);
  });

  it("nudges caregivers one hour later if the dose is still not taken", () => {
    expect(remindersDue([med], [], at(9, 5))).toEqual([
      { medicationId: "m1", date: "2026-10-08", slot: "08:00", kind: "late" },
    ]);
  });

  it("stays quiet once the dose is ticked", () => {
    const logs = [{ medicationId: "m1", date: "2026-10-08", slot: "08:00" }];
    expect(remindersDue([med], logs, at(8, 0))).toEqual([]);
    expect(remindersDue([med], logs, at(9, 5))).toEqual([]);
  });

  it("does not remind before the time or long after", () => {
    expect(remindersDue([med], [], at(7, 59))).toEqual([]);
    expect(remindersDue([med], [], at(10, 30))).toEqual([]);
  });

  it("skips stopped medicines", () => {
    expect(remindersDue([{ ...med, active: false }], [], at(8, 0))).toEqual([]);
  });
});
