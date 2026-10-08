import { describe, expect, it } from "vitest";
import { bookingPhase, scheduleProblem } from "./bookings";

const now = new Date("2026-10-09T10:00:00+05:30");
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe("scheduleProblem", () => {
  it("needs a time at least 5 minutes ahead", () => {
    expect(scheduleProblem(at(-30), now)).toBe("past");
    expect(scheduleProblem(at(2), now)).toBe("past");
    expect(scheduleProblem(at(30), now)).toBeNull();
  });
  it("can't be more than 60 days ahead", () => {
    expect(scheduleProblem(at(61 * 24 * 60), now)).toBe("tooFar");
  });
});

describe("bookingPhase", () => {
  it("a request waits for the doctor until its time has long passed", () => {
    expect(bookingPhase({ status: "requested", scheduledAt: at(30) }, now)).toBe("requested");
    expect(bookingPhase({ status: "requested", scheduledAt: at(-90) }, now)).toBe("missed");
  });
  it("an accepted call opens 10 minutes early and stays open an hour", () => {
    expect(bookingPhase({ status: "accepted", scheduledAt: at(30) }, now)).toBe("upcoming");
    expect(bookingPhase({ status: "accepted", scheduledAt: at(10) }, now)).toBe("now");
    expect(bookingPhase({ status: "accepted", scheduledAt: at(-59) }, now)).toBe("now");
    expect(bookingPhase({ status: "accepted", scheduledAt: at(-61) }, now)).toBe("missed");
  });
  it("declined and cancelled stay that way", () => {
    expect(bookingPhase({ status: "declined", scheduledAt: at(30) }, now)).toBe("declined");
    expect(bookingPhase({ status: "cancelled", scheduledAt: at(30) }, now)).toBe("cancelled");
  });
});
