// Booked calls with the doctor. Pure rules; the actions and pages load the data.

export const BOOKING_MIN_LEAD_MINUTES = 5; // book at least a few minutes ahead
export const BOOKING_MAX_DAYS_AHEAD = 60;
/** A call can be started from 10 minutes before until an hour after its time. */
export const JOIN_EARLY_MINUTES = 10;
export const JOIN_LATE_MINUTES = 60;

export type BookingStatus = "requested" | "accepted" | "declined" | "cancelled";
export type BookingPhase = "requested" | "upcoming" | "now" | "missed" | "declined" | "cancelled";

const MINUTE = 60_000;

/** Why a time can't be booked, or null if it can. */
export function scheduleProblem(scheduledAt: Date, now: Date): "past" | "tooFar" | null {
  const diff = scheduledAt.getTime() - now.getTime();
  if (Number.isNaN(diff) || diff < BOOKING_MIN_LEAD_MINUTES * MINUTE) return "past";
  if (diff > BOOKING_MAX_DAYS_AHEAD * 24 * 60 * MINUTE) return "tooFar";
  return null;
}

/** Where a booking stands right now. "now" = accepted and inside the join window. */
export function bookingPhase(booking: { status: BookingStatus; scheduledAt: Date }, now: Date): BookingPhase {
  if (booking.status === "declined" || booking.status === "cancelled") return booking.status;
  const diff = booking.scheduledAt.getTime() - now.getTime();
  if (diff < -JOIN_LATE_MINUTES * MINUTE) return "missed";
  if (booking.status === "requested") return "requested";
  return diff <= JOIN_EARLY_MINUTES * MINUTE ? "now" : "upcoming";
}
