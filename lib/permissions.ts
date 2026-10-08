import { cache } from "react";
import { forbidden } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, patients, type Role, type Scope } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const ROLES = ["owner", "caregiver", "family"] as const satisfies readonly Role[];
export const SCOPES = ["vitals", "meds", "meals", "mood"] as const satisfies readonly Scope[];

export const PERMISSIONS = [
  "view_summary", // today's summary
  "view_vitals", // sugar readings and trends
  "view_meals",
  "view_meds", // 7-day dose grid and adherence
  "log_glucose",
  "manage_meds", // add or edit medicines
  "mark_dose",
  "log_meals",
  "log_checkin", // walked today, sleep
  "log_labs", // HbA1c
  "edit_patient", // name and sugar limits, on the doctor's instruction
  "view_mood",
  "answer_mood",
  "view_insights",
  "receive_alerts",
  "manage_members", // invite, remove, change roles
  "create_share_link",
  "delete_patient",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type MembershipLike = { role: Role; scopes: readonly Scope[] };
export type PermissionContext = { patientHasOwner: boolean };

/** What each role may do at all. Copied from the "Family roles and permissions" table. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  caregiver: [
    "view_summary",
    "view_vitals",
    "view_meals",
    "view_meds",
    "log_glucose",
    "manage_meds",
    "mark_dose",
    "log_meals",
    "log_checkin",
    "log_labs",
    "edit_patient",
    "view_mood",
    "view_insights",
    "receive_alerts",
    "manage_members",
    "create_share_link",
  ],
  family: [
    "view_summary",
    "view_vitals",
    "view_meals",
    "view_meds",
    "mark_dose",
    "log_meals",
    "log_checkin",
    "receive_alerts",
  ],
};

/** Scopes a non-owner member must hold for a permission. The owner is never limited by scopes. */
export const PERMISSION_SCOPE: Partial<Record<Permission, readonly Scope[]>> = {
  view_vitals: ["vitals"],
  view_meals: ["meals"],
  view_meds: ["meds"],
  view_mood: ["mood"],
  view_insights: ["vitals", "meals"],
  receive_alerts: ["vitals"],
};

/** Caregivers always hear about a dangerous reading, even without the vitals scope. */
const SCOPE_EXEMPT: Partial<Record<Role, readonly Permission[]>> = {
  caregiver: ["receive_alerts"],
};

/** Pure check, no database. */
export function can(
  membership: MembershipLike | null | undefined,
  permission: Permission,
  ctx: PermissionContext
): boolean {
  if (!membership) return false;
  const { role, scopes } = membership;
  if (!ROLE_PERMISSIONS[role].includes(permission)) return false;
  if (role === "owner") return true;

  // A caregiver who set up the profile manages the family only until the patient joins.
  if (permission === "manage_members" && role === "caregiver" && ctx.patientHasOwner) return false;

  if (SCOPE_EXEMPT[role]?.includes(permission)) return true;
  const needed = PERMISSION_SCOPE[permission] ?? [];
  return needed.every((scope) => scopes.includes(scope));
}

export type PermissionMap = Record<Permission, boolean>;

/** Every permission at once, for hiding UI the member cannot use. */
export function permissionMap(
  membership: MembershipLike | null | undefined,
  ctx: PermissionContext
): PermissionMap {
  return Object.fromEntries(PERMISSIONS.map((p) => [p, can(membership, p, ctx)])) as PermissionMap;
}

/** Default scopes offered when inviting someone with this role. Mood is always off. */
export function defaultScopes(role: Role): Scope[] {
  if (role === "owner") return [...SCOPES];
  if (role === "caregiver") return ["vitals", "meds", "meals"];
  return ["meals"];
}

// ---------- Server side: the real gate ----------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

const loadAccess = cache(async (patientId: string, userId: string) => {
  const [row] = await db
    .select({ membership: memberships, patient: patients })
    .from(memberships)
    .innerJoin(patients, eq(memberships.patientId, patients.id))
    .where(and(eq(memberships.patientId, patientId), eq(memberships.userId, userId)))
    .limit(1);
  if (!row) return null;
  const [owner] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.patientId, patientId), eq(memberships.role, "owner")))
    .limit(1);
  const ctx: PermissionContext = { patientHasOwner: Boolean(owner) };
  return { ...row, ctx, permissions: permissionMap(row.membership, ctx) };
});

/**
 * Reads the session, loads the membership and calls can().
 * Renders the 403 page (or answers 403 to a Server Action) when not allowed.
 * Call it first in every page and Server Action under /p/[patientId].
 */
export async function requirePermission(patientId: string, permission: Permission) {
  const user = await requireUser();
  if (!isUuid(patientId)) forbidden();
  const access = await loadAccess(patientId, user.id);
  if (!access || !can(access.membership, permission, access.ctx)) forbidden();
  return { user, ...access };
}

/** Same lookup as requirePermission, but returns null instead of a 403 (for optional UI). */
export async function getAccess(patientId: string) {
  const user = await requireUser();
  if (!isUuid(patientId)) return null;
  const access = await loadAccess(patientId, user.id);
  return access ? { user, ...access } : null;
}
