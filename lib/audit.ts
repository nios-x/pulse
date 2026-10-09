import "server-only";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function audit(familyId: string, actorUserId: string | null, action: string, detail: Record<string, unknown> = {}) {
  await db.insert(auditLog).values({ familyId, actorUserId, action, detail });
}
