// The four roles people see (Admin, Caregiver, Member, Viewer), the actions in the
// permissions matrix, and the demo-only "View as" preview. Pure, no database.
//
// The database keeps its own roles (owner, caregiver, family, doctor) and
// lib/permissions.ts stays the real gate. These names are a lens over them:
//   caregiver (family head) -> Admin      runs the family's health
//   family                  -> Caregiver  helps with doses and logs
//   owner (the patient)     -> Member     their own profile
//   doctor                  -> Viewer     reads what is shared
// "View as" can only take permissions away, never add one.

import type { Role } from "@/db/schema";
import type { Permission, PermissionMap } from "@/lib/permissions";

export const APP_ROLES = ["admin", "caregiver", "member", "viewer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_OF: Record<Role, AppRole> = {
  caregiver: "admin",
  family: "caregiver",
  owner: "member",
  doctor: "viewer",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Rows of the permissions matrix, in plain words. */
export const MATRIX_ACTIONS = [
  "view_health",
  "view_vitals",
  "log_readings",
  "mark_doses",
  "manage_meds",
  "book_appointments",
  "upload_records",
  "edit_emergency",
  "manage_members",
  "share_doctor",
  "delete_profile",
] as const;
export type MatrixAction = (typeof MATRIX_ACTIONS)[number];

export type Matrix = Record<AppRole, readonly MatrixAction[]>;

export const DEFAULT_MATRIX: Matrix = {
  admin: MATRIX_ACTIONS,
  caregiver: ["view_health", "view_vitals", "log_readings", "mark_doses", "manage_meds", "book_appointments", "upload_records"],
  member: [
    "view_health",
    "view_vitals",
    "log_readings",
    "mark_doses",
    "manage_meds",
    "book_appointments",
    "upload_records",
    "edit_emergency",
    "share_doctor",
  ],
  viewer: ["view_health", "view_vitals"],
};

/** Which real permissions each matrix row controls. */
export const ACTION_PERMISSIONS: Record<MatrixAction, readonly Permission[]> = {
  view_health: ["view_summary", "view_meals", "view_meds"],
  view_vitals: ["view_vitals", "view_insights"],
  log_readings: ["log_glucose", "log_meals", "log_checkin"],
  mark_doses: ["mark_dose"],
  manage_meds: ["manage_meds"],
  book_appointments: ["book_call"],
  upload_records: ["log_labs"],
  edit_emergency: ["edit_patient"],
  manage_members: ["manage_members"],
  share_doctor: ["create_share_link"],
  delete_profile: ["delete_patient"],
};

/** The matrix row that controls a real permission, if any. */
export function actionFor(permission: Permission): MatrixAction | null {
  for (const action of MATRIX_ACTIONS) {
    if (ACTION_PERMISSIONS[action].includes(permission)) return action;
  }
  return null;
}

/**
 * What the UI may offer while previewing as `viewAs`.
 * A Member sees only their own profile; on anyone else's, nothing is open.
 * Real permissions always cap the result.
 */
export function previewPermissions(
  real: PermissionMap,
  viewAs: AppRole,
  matrix: Matrix,
  realRole: Role
): PermissionMap {
  const ownProfile = realRole === "owner";
  const allowed = new Set(matrix[viewAs]);
  return Object.fromEntries(
    (Object.keys(real) as Permission[]).map((p) => {
      if (!real[p]) return [p, false];
      if (viewAs === "member" && !ownProfile) return [p, false];
      const action = actionFor(p);
      return [p, action ? allowed.has(action) : true];
    })
  ) as PermissionMap;
}

/** Cookie value for a custom matrix: "admin:a,b|caregiver:c". Unknown parts are dropped. */
export function encodeMatrix(matrix: Matrix): string {
  return APP_ROLES.map((r) => `${r}:${matrix[r].join(",")}`).join("|");
}

export function decodeMatrix(value: string | undefined | null): Matrix {
  if (!value) return DEFAULT_MATRIX;
  const out: Record<AppRole, MatrixAction[]> = { admin: [], caregiver: [], member: [], viewer: [] };
  const seen = new Set<AppRole>();
  for (const part of value.split("|")) {
    const [role, list = ""] = part.split(":");
    if (!isAppRole(role)) continue;
    seen.add(role);
    out[role] = list
      .split(",")
      .filter((a): a is MatrixAction => (MATRIX_ACTIONS as readonly string[]).includes(a));
  }
  // A malformed cookie never locks anyone out of the preview: fall back per role.
  for (const role of APP_ROLES) if (!seen.has(role)) out[role] = [...DEFAULT_MATRIX[role]];
  return out;
}

export function toggleMatrix(matrix: Matrix, role: AppRole, action: MatrixAction, on: boolean): Matrix {
  const current = new Set(matrix[role]);
  if (on) current.add(action);
  else current.delete(action);
  return { ...matrix, [role]: MATRIX_ACTIONS.filter((a) => current.has(a)) };
}
