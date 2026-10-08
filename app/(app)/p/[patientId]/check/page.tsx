import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { WeeklyCheck } from "@/components/safety/weekly-check";
import { requirePermission } from "@/lib/permissions";

export default async function CheckPage({ params }: PageProps<"/p/[patientId]/check">) {
  const { patientId } = await params;
  // Owner only: caregivers and family get the 403 page.
  await requirePermission(patientId, "answer_mood");

  const family = await db
    .select({ name: users.name, phone: users.phone })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.patientId, patientId), inArray(memberships.role, ["caregiver"])));

  return <WeeklyCheck patientId={patientId} family={family} />;
}
