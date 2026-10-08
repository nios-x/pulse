import { and, asc, eq, gte, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  dailyCheckins,
  glucoseReadings,
  meals,
  medications,
  medLogs,
  memberships,
  users,
  type GlucoseContext,
  type MealSlot,
} from "@/db/schema";
import { addDays, istDateTime } from "@/lib/dates";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import type { PermissionMap } from "@/lib/permissions";

type Base = { id: string; at: Date; loggedBy: string | null; loggerName: string | null };
export type TimelineItem =
  | (Base & { kind: "reading"; mgdl: number; context: GlucoseContext })
  | (Base & { kind: "meal"; slot: MealSlot; items: string[] })
  | (Base & { kind: "dose"; medName: string; dose: string; slot: string })
  | (Base & { kind: "checkin"; walked: boolean | null; sleep: number | null });

/** "You logged", "Papa logged" or "Rahul logged for Papa". */
export function whoLogged(args: {
  loggedBy: string | null;
  loggerName: string | null;
  viewerId: string;
  ownerUserId: string | null;
  patientName: string;
}): { key: MessageKey; vars?: TranslateVars } {
  if (!args.loggedBy) return { key: "timeline.logged" };
  if (args.loggedBy === args.viewerId) return { key: "timeline.byYou" };
  if (args.loggedBy === args.ownerUserId) return { key: "timeline.bySelf", vars: { patient: args.patientName } };
  return { key: "timeline.byOther", vars: { name: args.loggerName ?? "", patient: args.patientName } };
}

/** Today's logs for one patient, filtered by what this member may see. Newest first. */
export async function getDayTimeline(patientId: string, date: string, permissions: PermissionMap) {
  const from = istDateTime(date);
  const to = istDateTime(addDays(date, 1));
  const logger = alias(users, "logger");

  const [readings, mealRows, doseRows, checkins, owner] = await Promise.all([
    permissions.view_vitals
      ? db
          .select({
            id: glucoseReadings.id,
            at: glucoseReadings.measuredAt,
            loggedBy: glucoseReadings.loggedBy,
            loggerName: logger.name,
            mgdl: glucoseReadings.mgdl,
            context: glucoseReadings.context,
          })
          .from(glucoseReadings)
          .leftJoin(logger, eq(glucoseReadings.loggedBy, logger.id))
          .where(
            and(
              eq(glucoseReadings.patientId, patientId),
              gte(glucoseReadings.measuredAt, from),
              lt(glucoseReadings.measuredAt, to)
            )
          )
      : [],
    permissions.view_meals
      ? db
          .select({
            id: meals.id,
            at: meals.eatenAt,
            loggedBy: meals.loggedBy,
            loggerName: logger.name,
            slot: meals.slot,
            items: meals.items,
          })
          .from(meals)
          .leftJoin(logger, eq(meals.loggedBy, logger.id))
          .where(and(eq(meals.patientId, patientId), gte(meals.eatenAt, from), lt(meals.eatenAt, to)))
      : [],
    permissions.view_meds
      ? db
          .select({
            id: medLogs.id,
            at: medLogs.takenAt,
            loggedBy: medLogs.loggedBy,
            loggerName: logger.name,
            medName: medications.name,
            dose: medications.dose,
            slot: medLogs.slot,
          })
          .from(medLogs)
          .innerJoin(medications, eq(medLogs.medicationId, medications.id))
          .leftJoin(logger, eq(medLogs.loggedBy, logger.id))
          .where(and(eq(medLogs.patientId, patientId), eq(medLogs.date, date)))
      : [],
    db
      .select({
        id: dailyCheckins.id,
        at: dailyCheckins.createdAt,
        loggedBy: dailyCheckins.loggedBy,
        loggerName: logger.name,
        walked: dailyCheckins.walked,
        sleep: dailyCheckins.sleep,
      })
      .from(dailyCheckins)
      .leftJoin(logger, eq(dailyCheckins.loggedBy, logger.id))
      .where(and(eq(dailyCheckins.patientId, patientId), eq(dailyCheckins.date, date))),
    db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.patientId, patientId), eq(memberships.role, "owner")))
      .orderBy(asc(memberships.createdAt))
      .limit(1),
  ]);

  const items: TimelineItem[] = [
    ...readings.map((r) => ({ ...r, kind: "reading" as const })),
    ...mealRows.map((m) => ({ ...m, kind: "meal" as const })),
    ...doseRows.map((d) => ({ ...d, kind: "dose" as const })),
    ...checkins.map((c) => ({ ...c, kind: "checkin" as const })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return { items, ownerUserId: owner[0]?.userId ?? null };
}
