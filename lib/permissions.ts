import type { PermissionOverrides, Role } from "@/db/schema";

/**
 * Role-based access, pure and shared by server and client.
 * The server enforces every check (lib/context.ts → requireCan); the client uses
 * the same function only to hide or disable controls and explain why.
 */

export const ROLES: Role[] = ["admin", "caregiver", "member", "viewer"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  caregiver: "Caregiver",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_SUMMARY: Record<Role, string> = {
  admin: "Full control of the family, members and settings",
  caregiver: "Views and updates medicines and appointments for the people assigned to them",
  member: "Sees and manages only their own health profile",
  viewer: "Can look at everything but cannot change anything",
};

export type Action =
  | "member.view"
  | "member.edit"
  | "member.add"
  | "meds.manage"
  | "doses.log"
  | "vitals.log"
  | "appointments.manage"
  | "records.view"
  | "records.upload"
  | "sharing.manage"
  | "triage.use"
  | "family.manage";

export const ACTIONS: { key: Action; label: string; description: string }[] = [
  { key: "member.view", label: "See health profiles", description: "Vitals, medicines, conditions and allergies" },
  { key: "member.edit", label: "Edit health profiles", description: "Allergies, conditions, blood group, contacts" },
  { key: "member.add", label: "Add family members", description: "Create new health profiles" },
  { key: "meds.manage", label: "Add or change medicines", description: "Schedules, refills, stopping a medicine" },
  { key: "doses.log", label: "Mark doses taken", description: "Tick off today's medicines" },
  { key: "vitals.log", label: "Record vitals", description: "BP, sugar, weight and more" },
  { key: "appointments.manage", label: "Book and edit appointments", description: "Clinic visits and video consults" },
  { key: "records.view", label: "Open health records", description: "Reports, prescriptions, scans" },
  { key: "records.upload", label: "Upload records", description: "Add reports and scan prescriptions" },
  { key: "sharing.manage", label: "Share with doctors", description: "Time-limited links and the emergency card QR" },
  { key: "triage.use", label: "Use symptom check", description: "AI-assisted triage with safety rules" },
  { key: "family.manage", label: "Manage family and roles", description: "Invites, roles and this permissions table" },
];

export const DEFAULT_PERMISSIONS: Record<Role, Record<Action, boolean>> = {
  admin: {
    "member.view": true,
    "member.edit": true,
    "member.add": true,
    "meds.manage": true,
    "doses.log": true,
    "vitals.log": true,
    "appointments.manage": true,
    "records.view": true,
    "records.upload": true,
    "sharing.manage": true,
    "triage.use": true,
    "family.manage": true,
  },
  caregiver: {
    "member.view": true,
    "member.edit": false,
    "member.add": false,
    "meds.manage": true,
    "doses.log": true,
    "vitals.log": true,
    "appointments.manage": true,
    "records.view": true,
    "records.upload": true,
    "sharing.manage": false,
    "triage.use": true,
    "family.manage": false,
  },
  member: {
    "member.view": true,
    "member.edit": true,
    "member.add": false,
    "meds.manage": true,
    "doses.log": true,
    "vitals.log": true,
    "appointments.manage": true,
    "records.view": true,
    "records.upload": true,
    "sharing.manage": true,
    "triage.use": true,
    "family.manage": false,
  },
  viewer: {
    "member.view": true,
    "member.edit": false,
    "member.add": false,
    "meds.manage": false,
    "doses.log": false,
    "vitals.log": false,
    "appointments.manage": false,
    "records.view": true,
    "records.upload": false,
    "sharing.manage": false,
    "triage.use": false,
    "family.manage": false,
  },
};

/** Cells nobody can toggle: the admin row (so nobody locks the family out) and family.manage. */
export function isLocked(role: Role, action: Action): boolean {
  return role === "admin" || action === "family.manage";
}

/** Viewers may only ever read: these actions can never be turned on for them. */
const READ_ACTIONS: Action[] = ["member.view", "records.view"];

export function canToggle(role: Role, action: Action): boolean {
  if (isLocked(role, action)) return false;
  if (role === "viewer" && !READ_ACTIONS.includes(action)) return false;
  return true;
}

export type AccessContext = {
  role: Role;
  /** The signed-in person's own health profile in this family. */
  selfMemberId: string | null;
  /** Caregivers only. */
  assignedMemberIds: string[];
  overrides: PermissionOverrides;
};

export function roleAllows(role: Role, action: Action, overrides: PermissionOverrides): boolean {
  if (isLocked(role, action)) return DEFAULT_PERMISSIONS[role][action];
  const override = overrides[role]?.[action];
  if (typeof override === "boolean" && canToggle(role, action)) return override;
  return DEFAULT_PERMISSIONS[role][action];
}

/** Which members a role can reach at all. */
export function inScope(ctx: AccessContext, memberId: string): boolean {
  switch (ctx.role) {
    case "admin":
    case "viewer":
      return true;
    case "caregiver":
      return memberId === ctx.selfMemberId || ctx.assignedMemberIds.includes(memberId);
    case "member":
      return memberId === ctx.selfMemberId;
  }
}

/** Family-wide actions (no member) only check the role; member actions also check scope. */
export function can(ctx: AccessContext, action: Action, memberId?: string | null): boolean {
  if (!roleAllows(ctx.role, action, ctx.overrides)) return false;
  if (memberId == null) return true;
  return inScope(ctx, memberId);
}

/** Plain-language reason for a disabled control, or null when allowed. */
export function denialReason(ctx: AccessContext, action: Action, memberId?: string | null): string | null {
  if (can(ctx, action, memberId)) return null;
  const roleName = ROLE_LABEL[ctx.role];
  if (!roleAllows(ctx.role, action, ctx.overrides)) {
    if (ctx.role === "viewer") return "Viewers can look but not make changes. Ask your family admin for more access.";
    if (action === "family.manage") return "Only the family admin can manage members and roles.";
    const changed = typeof ctx.overrides[ctx.role]?.[action] === "boolean";
    return changed
      ? `Your family admin has turned this off for ${roleName.toLowerCase()}s.`
      : `${roleName}s can't do this. Ask your family admin.`;
  }
  if (ctx.role === "caregiver") return "Caregivers can only update the people assigned to them.";
  if (ctx.role === "member") return "Members can only change their own health profile.";
  return "You don't have access to this.";
}

/** Merge a single toggle into the stored overrides, rejecting locked cells. */
export function applyToggle(
  overrides: PermissionOverrides,
  role: Role,
  action: Action,
  allowed: boolean
): PermissionOverrides {
  if (!canToggle(role, action)) throw new Error("This permission cannot be changed");
  const next: PermissionOverrides = structuredClone(overrides);
  const roleMap = { ...(next[role] ?? {}) };
  if (allowed === DEFAULT_PERMISSIONS[role][action]) delete roleMap[action];
  else roleMap[action] = allowed;
  next[role] = roleMap;
  return next;
}

/** The effective matrix for display. */
export function effectiveMatrix(overrides: PermissionOverrides): Record<Role, Record<Action, boolean>> {
  const out = {} as Record<Role, Record<Action, boolean>>;
  for (const role of ROLES) {
    out[role] = {} as Record<Action, boolean>;
    for (const { key } of ACTIONS) out[role][key] = roleAllows(role, key, overrides);
  }
  return out;
}

/** Roles an admin may assign; you can't demote the last admin (checked server-side). */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}
