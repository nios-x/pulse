import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { TicketIcon, UsersRoundIcon } from "lucide-react";
import { db } from "@/db";
import { invites, memberships, patients, users } from "@/db/schema";
import { AcceptInviteForm } from "@/components/profile/accept-invite-form";
import { SplashFrame } from "@/components/shapes/splash-frame";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { inviteCodeSchema } from "@/lib/validators";

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code: rawCode } = await params;
  const parsed = inviteCodeSchema.safeParse(rawCode);
  const code = parsed.success ? parsed.data : rawCode;

  const user = await getCurrentUser();
  // No account yet: sign up (or in) first; the invite rides along.
  if (!user) {
    const c = encodeURIComponent(code);
    redirect(`/auth?invite=${c}&next=/join/${c}`);
  }

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
    <SplashFrame
      brand={t("app.name")}
      badge={valid && !membership ? <UsersRoundIcon aria-hidden /> : <TicketIcon aria-hidden />}
    >
      {!invite || !valid ? (
        <section className="flex flex-col gap-4 text-center">
          <h1 className="text-[1.75rem] leading-tight">{t("join.invalidTitle")}</h1>
          <p className="text-lg text-ink-2">{t("join.error.invalid")}</p>
          <Link href="/home" className={buttonVariants({ size: "xl", variant: "outline", className: "mt-4" })}>
            {t("forbidden.home")}
          </Link>
        </section>
      ) : membership ? (
        <section className="flex flex-col gap-6 text-center">
          <h1 className="text-[1.75rem] leading-tight">{t("join.error.already")}</h1>
          <Link href={`/home?p=${invite.patientId}`} className={buttonVariants({ size: "xl" })}>
            {t("join.open", { name: invite.patientName })}
          </Link>
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-6">
          <div className="text-center">
            <p className="text-base text-ink-2">
              {t("join.invitedBy", { name: invite.inviterName ?? t("app.name") })}
            </p>
            <h1 className="mt-1 text-[1.75rem] leading-tight">
              {invite.role === "owner"
                ? t("join.asOwner")
                : t("join.careTeam", { name: invite.patientName })}
            </h1>
          </div>
          <div className="rounded-2xl bg-violet-wash/70 p-4">
            <Badge className="h-8 px-3.5 font-heading text-sm font-semibold">{t(`role.${invite.role}`)}</Badge>
            <p className="mt-3 text-base text-plum">{t(`role.${invite.role}.about`)}</p>
            {invite.role !== "owner" && invite.scopes.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-ink-3">{t("join.canSee")}:</span>
                {invite.scopes.map((s) => (
                  <Badge key={s} variant="outline">
                    {t(`scope.${s}`)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <AcceptInviteForm code={code} />
          <LanguageSwitch className="mt-auto pt-4" />
        </section>
      )}
    </SplashFrame>
  );
}
