import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { KeyRoundIcon, RefreshCwIcon } from "lucide-react";
import { renewLoginInviteAction } from "@/app/(app)/p/[patientId]/family/actions";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { InviteShare } from "@/components/family/invite-share";
import { Button, buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n-server";
import { inviteShare } from "@/lib/invites";
import { requirePermission } from "@/lib/permissions";

/** After adding a family member: send them a link to make their own login. */
export default async function LoginLinkPage({ params }: PageProps<"/p/[patientId]/family/login">) {
  const { patientId } = await params;
  const { user, patient, ctx } = await requirePermission(patientId, "manage_members");
  if (ctx.patientHasOwner) redirect(`/home?p=${patientId}`);
  const { t } = await getT();

  const [invite] = await db
    .select({ code: invites.code })
    .from(invites)
    .where(
      and(
        eq(invites.patientId, patientId),
        eq(invites.role, "owner"),
        isNull(invites.usedAt),
        gt(invites.expiresAt, sql`now()`)
      )
    )
    .orderBy(desc(invites.createdAt))
    .limit(1);
  const share = invite
    ? await inviteShare({ code: invite.code, role: "owner", inviterName: user.name, patientName: patient.name })
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <KeyRoundIcon className="size-10 text-primary" aria-hidden />
        <h1 className="text-[2rem] leading-tight">{t("login.title", { name: patient.name })}</h1>
        <p className="text-lg text-muted-foreground">{t("login.body", { name: patient.name })}</p>
      </div>

      {invite && share ? (
        <InviteShare code={invite.code} url={share.url} whatsapp={share.whatsapp} />
      ) : (
        <form action={renewLoginInviteAction} className="flex flex-col gap-3">
          <p className="text-base">{t("login.expired")}</p>
          <input type="hidden" name="patientId" value={patientId} />
          <Button type="submit" size="xl">
            <RefreshCwIcon aria-hidden />
            {t("login.renew")}
          </Button>
        </form>
      )}

      <Link href={`/home?p=${patientId}`} className={buttonVariants({ size: "touch", variant: "outline" })}>
        {t("login.later")}
      </Link>
      <p className="text-sm text-muted-foreground">{t("login.findAgain")}</p>
    </div>
  );
}
