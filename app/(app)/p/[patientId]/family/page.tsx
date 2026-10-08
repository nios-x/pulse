import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { invites, memberships, users } from "@/db/schema";
import { CallButtons } from "@/components/call/call-buttons";
import { InviteForm } from "@/components/family/invite-form";
import { MemberControls } from "@/components/family/member-controls";
import { RevokeInviteButton } from "@/components/family/revoke-invite-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n-server";
import { requirePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default async function FamilyPage({ params }: PageProps<"/p/[patientId]/family">) {
  const { patientId } = await params;
  const { user, membership, patient, ctx, permissions } = await requirePermission(patientId, "view_summary");
  const { t } = await getT();
  const canManage = permissions.manage_members;
  const isOwner = membership.role === "owner";

  const members = await db
    .select({
      membershipId: memberships.id,
      userId: users.id,
      name: users.name,
      phone: users.phone,
      role: memberships.role,
      scopes: memberships.scopes,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.patientId, patientId))
    .orderBy(asc(memberships.createdAt));

  const pending = canManage
    ? await db
        .select({ id: invites.id, code: invites.code, role: invites.role, expiresAt: invites.expiresAt })
        .from(invites)
        .where(and(eq(invites.patientId, patientId), isNull(invites.usedAt), gt(invites.expiresAt, sql`now()`)))
        .orderBy(asc(invites.createdAt))
    : [];

  const roleBadge = { owner: "default", caregiver: "secondary", family: "outline" } as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("page.family")}</h1>
        <p className="mt-1 text-muted-foreground">
          {canManage ? t("family.subtitleManage") : t("family.subtitleView")}
        </p>
      </div>

      {!ctx.patientHasOwner ? (
        <p className="rounded-xl bg-warning/25 px-4 py-3 text-base text-warning-foreground">
          {t("family.notJoined", { name: patient.name })}
        </p>
      ) : null}

      <section aria-labelledby="members-heading" className="flex flex-col gap-3">
        <h2 id="members-heading" className="text-lg font-semibold">
          {t("family.members")}
        </h2>
        {members.map((m) => {
          const editable = canManage && m.role !== "owner" && m.userId !== user.id;
          return (
            <Card key={m.membershipId} size="sm">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold",
                      m.role === "owner" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {m.name}
                      {m.userId === user.id ? (
                        <span className="font-normal text-muted-foreground"> · {t("family.you")}</span>
                      ) : null}
                    </p>
                    {m.role !== "owner" && !editable ? (
                      <p className="text-sm text-muted-foreground">
                        {m.scopes.length
                          ? m.scopes.map((s) => t(`scope.${s}`)).join(", ")
                          : t("family.noScopes")}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={roleBadge[m.role]} className="h-7 px-3 text-sm">
                    {t(`role.${m.role}`)}
                  </Badge>
                </div>
                {permissions.start_call && m.userId !== user.id ? (
                  <div className="flex justify-end">
                    <CallButtons patientId={patientId} userId={m.userId} name={m.name} />
                  </div>
                ) : null}
                {editable ? (
                  <MemberControls
                    patientId={patientId}
                    membershipId={m.membershipId}
                    name={m.name}
                    role={m.role as "caregiver" | "family"}
                    scopes={m.scopes}
                    canToggleMood={isOwner}
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("invite.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm
              patientId={patientId}
              patientName={patient.name}
              allowOwner={!ctx.patientHasOwner}
              canShareMood={isOwner}
            />
          </CardContent>
        </Card>
      ) : null}

      {pending.length ? (
        <section aria-labelledby="pending-heading" className="flex flex-col gap-2">
          <h2 id="pending-heading" className="text-lg font-semibold">
            {t("invite.pending")}
          </h2>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {pending.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-2">
                <span className="font-mono text-lg font-semibold tracking-widest">{inv.code}</span>
                <span className="flex-1 text-sm text-muted-foreground">{t(`role.${inv.role}`)}</span>
                <RevokeInviteButton patientId={patientId} inviteId={inv.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
