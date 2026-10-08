import { db } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditAction =
  | "doctor_signed_up"
  | "patient_created"
  | "invite_created"
  | "invite_revoked"
  | "member_joined"
  | "role_changed"
  | "scopes_changed"
  | "member_removed"
  | "share_link_created"
  | "share_link_revoked"
  | "patient_deleted";

type Executor = Pick<typeof db, "insert">;

/** Member changes, share links and data deletion all leave a row here. */
export async function audit(
  entry: {
    actorUserId: string;
    patientId: string | null;
    action: AuditAction;
    detail?: Record<string, unknown>;
  },
  executor: Executor = db
) {
  await executor.insert(auditLog).values({ ...entry, detail: entry.detail ?? {} });
}
