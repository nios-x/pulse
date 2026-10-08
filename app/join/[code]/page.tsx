import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { HeartPulseIcon } from "lucide-react";
import { db } from "@/db";
import { invites, memberships, patients, users } from "@/db/schema";
import { AcceptInviteForm } from "@/components/profile/accept-invite-form";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { inviteCodeSchema } from "@/lib/validators";

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code: rawCode } = await params;
  const parsed = inviteCodeSchema.safeParse(rawCode);
  const code = parsed.success ? parsed.data : rawCode;

  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/join/${encodeURIComponent(code)}&tab=signup`);

  const { t } = await getT();
  const [invite] = parsed.success
    ? await db
        .select({
          role: invites.role,
          scopes: invites.scopes,
          active: sql<boolean>`(${invites.usedAt} is null and ${invites.expiresAt} > now())`,
          patientId: invites.patientId,
          patientName: patients.name,
          inviterName: users.name,
        })
        .from(invites)
        .innerJoin(patients, eq(invites.patientId, patients.id))
        .leftJoin(users, eq(invites.createdBy, users.id))
        .where(eq(invites.code, parsed.data))
        .limit(1)
    : [];

  const valid = invite?.active;
  const [membership] = invite
    ? await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.patientId, invite.patientId), eq(memberships.userId, user.id)))
        .limit(1)
    : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 py-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <HeartPulseIcon className="size-7" aria-hidden />
      </span>

      {!invite || !valid ? (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{t("join.invalidTitle")}</h1>
          <p className="text-lg text-muted-foreground">{t("join.error.invalid")}</p>
          <Link href="/home" className={buttonVariants({ size: "touch", variant: "outline" })}>
            {t("forbidden.home")}
          </Link>
        </section>
      ) : membership ? (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{t("join.error.already")}</h1>
          <Link href={`/home?p=${invite.patientId}`} className={buttonVariants({ size: "xl" })}>
            {t("join.open", { name: invite.patientName })}
          </Link>
        </section>
      ) : (
        <section className="flex flex-col gap-5">
          <div>
            <p className="text-lg text-muted-foreground">
              {t("join.invitedBy", { name: invite.inviterName ?? t("app.name") })}
            </p>
            <h1 className="mt-1 text-3xl font-bold">
              {invite.role === "owner"
                ? t("join.asOwner")
                : t("join.careTeam", { name: invite.patientName })}
            </h1>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Badge className="h-7 px-3 text-sm">{t(`role.${invite.role}`)}</Badge>
              </div>
              <p className="text-base">{t(`role.${invite.role}.about`)}</p>
              {invite.role !== "owner" && invite.scopes.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("join.canSee")}: {invite.scopes.map((s) => t(`scope.${s}`)).join(", ")}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <LanguageSwitch />
          <AcceptInviteForm code={code} />
        </section>
      )}
    </main>
  );
}
