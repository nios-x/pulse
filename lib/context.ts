import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { families, members, type Family, type Member, type Role } from "@/db/schema";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { can, denialReason, inScope, isRole, type AccessContext, type Action } from "@/lib/permissions";
import { VIEW_AS_COOKIE } from "@/lib/session-cookie";

export type AppContext = {
  user: CurrentUser;
  family: Family;
  /** The signed-in person's own health profile. */
  self: Member;
  actualRole: Role;
  /** The role in force for this request. Differs from actualRole only in the admin's demo "View as". */
  role: Role;
  viewingAs: Role | null;
  access: AccessContext;
  members: Member[];
  /** Members this role may see. */
  visibleMembers: Member[];
};

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Loads the family, role and permissions for the signed-in user. No family yet → onboarding. */
export const getContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser();
  const [self] = await db.select().from(members).where(eq(members.userId, user.id)).limit(1);
  if (!self) redirect("/onboarding");
  const [family] = await db.select().from(families).where(eq(families.id, self.familyId)).limit(1);
  if (!family) redirect("/onboarding");
  const all = await db.select().from(members).where(eq(members.familyId, family.id)).orderBy(asc(members.createdAt));

  const actualRole = self.role;
  const cookieValue = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  // Only an admin can preview other roles, and only ever downwards.
  const viewingAs = actualRole === "admin" && isRole(cookieValue) && cookieValue !== "admin" ? cookieValue : null;
  const role = viewingAs ?? actualRole;

  let assigned = self.assignedMemberIds;
  if (viewingAs === "caregiver" && assigned.length === 0) {
    // Demo preview: an admin previewing "caregiver" looks after the elders.
    assigned = all.filter((m) => m.relation === "parent" || m.relation === "grandparent").map((m) => m.id);
  }

  const access: AccessContext = {
    role,
    selfMemberId: self.id,
    assignedMemberIds: assigned,
    overrides: family.permissions ?? {},
  };

  const visibleMembers = all.filter((m) => inScope(access, m.id) && can(access, "member.view", m.id));
  return { user, family, self, actualRole, role, viewingAs, access, members: all, visibleMembers };
});

export function allowed(ctx: AppContext, action: Action, memberId?: string | null): boolean {
  return can(ctx.access, action, memberId);
}

/** Throws ForbiddenError with a plain-language reason. Use in every Server Action and Route Handler. */
export function requireCan(ctx: AppContext, action: Action, memberId?: string | null): void {
  if (memberId && !ctx.members.some((m) => m.id === memberId)) throw new ForbiddenError("That person isn't in your family.");
  const reason = denialReason(ctx.access, action, memberId);
  if (reason) throw new ForbiddenError(reason);
}

/** For pages: the member, or a 404 if they aren't visible to this role. */
export function findVisibleMember(ctx: AppContext, memberId: string): Member | null {
  return ctx.visibleMembers.find((m) => m.id === memberId) ?? null;
}
