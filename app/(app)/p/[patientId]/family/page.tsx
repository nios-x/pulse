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
import { canCallBetween, requirePermission } from "@/lib/permissions";
import { Blob } from "@/components/shapes/shapes";
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
      clinic: users.clinic,
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

  const roleBadge = { owner: "default", caregiver: "secondary", family: "outline", doctor: "secondary" } as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[2rem] leading-tight">{t("page.family")}</h1>
        <p className="mt-1 text-base text-ink-2">
          {canManage ? t("family.subtitleManage") : t("family.subtitleView")}
        </p>
      </div>

      {!ctx.patientHasOwner ? (
        <p className="rounded-2xl bg-watch-wash px-4 py-3 text-base font-medium text-watch-ink">
          {t("family.notJoined", { name: patient.name })}
        </p>
      ) : null}

      <section aria-labelledby="members-heading" className="flex flex-col gap-3">
        <h2 id="members-heading" className="text-xl font-semibold">
          {t("family.members")}
        </h2>
        {members.map((m) => {
          const editable = canManage && m.role !== "owner" && m.userId !== user.id;
          return (
            <Card key={m.membershipId} size="sm">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="relative flex size-12 shrink-0 items-center justify-center">
                    <Blob
                      seed={m.name.length * 3 + 1}
                      wobble={0.14}
                      className={cn("absolute inset-0 size-full", m.role === "owner" ? "text-violet" : m.role === "doctor" ? "text-go" : "text-lilac")}
                    />
                    <span
                      className={cn(
                        "relative font-heading text-lg font-bold",
                        m.role === "owner" || m.role === "doctor" ? "text-white" : "text-violet-deep"
                      )}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-base font-semibold text-plum">
                      {m.name}
                      {m.userId === user.id ? (
                        <span className="font-normal text-muted-foreground"> · {t("family.you")}</span>
                      ) : null}
                    </p>
                    {m.role === "doctor" && m.clinic ? (
                      <p className="truncate text-sm text-ink-2">{m.clinic}</p>
                    ) : null}
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
                {/* In-app calls only connect the family with their doctor. */}
                {permissions.start_call && m.userId !== user.id && canCallBetween(membership.role, m.role) ? (
                  <div className="flex justify-end">
                    <CallButtons patientId={patientId} userId={m.userId} name={m.name} />
                  </div>
                ) : null}
                {editable ? (
                  <MemberControls
                    patientId={patientId}
                    membershipId={m.membershipId}
                    name={m.name}
                    role={m.role as "caregiver" | "family" | "doctor"}
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
          <h2 id="pending-heading" className="text-xl font-semibold">
            {t("invite.pending")}
          </h2>
          <ul className="flex flex-col divide-y divide-edge sheet rounded-xl">
            {pending.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-heading text-lg font-bold tracking-[0.25em] text-violet-deep">{inv.code}</span>
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
