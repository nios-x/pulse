import { redirect } from "next/navigation";
import { HeartPulseIcon } from "lucide-react";
import { AuthForms } from "@/components/auth/auth-forms";
import { FormMessage } from "@/components/form/text-field";
import { JoinCodeForm } from "@/components/profile/join-code-form";
import { SplashFrame } from "@/components/shapes/splash-frame";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { findActiveInvite } from "@/lib/join";
import { inviteCodeSchema, nextPathSchema } from "@/lib/validators";

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const params = await searchParams;
  const next = nextPathSchema.parse(params.next);
  if (await getCurrentUser()) redirect(next);

  const { t } = await getT();
  // Anyone can create an account here. A live invite code also joins that family.
  const code = params.invite === undefined ? null : inviteCodeSchema.safeParse(params.invite);
  const invite = code?.success ? await findActiveInvite(code.data) : null;
  const inviteCode = invite && code?.success ? code.data : null;

  return (
    <SplashFrame brand={t("app.name")} badge={<HeartPulseIcon aria-hidden />}>
      <div className="text-center">
        {inviteCode && invite ? (
          <>
            <p className="text-base text-ink-2">{t("join.invitedBy", { name: invite.inviterName ?? t("app.name") })}</p>
            <h1 className="mt-1 text-[1.75rem] leading-tight">
              {invite.role === "owner" ? t("join.asOwner") : t("join.careTeam", { name: invite.patientName })}
            </h1>
          </>
        ) : (
          <>
            <h1 className="text-[2rem] leading-tight">{t("app.tagline")}</h1>
            <p className="mx-auto mt-2 max-w-[30ch] text-base text-ink-2">{t("auth.intro")}</p>
          </>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-6">
        {code && !inviteCode ? <FormMessage>{t("join.error.invalid")}</FormMessage> : null}
        <AuthForms
          next={inviteCode ? `/join/${inviteCode}` : next}
          inviteCode={inviteCode}
          inviteRole={inviteCode ? (invite?.role ?? null) : null}
          defaultTab={inviteCode || params.tab === "signup" ? "signup" : "signin"}
        />
        {inviteCode ? null : (
          <section className="rounded-2xl bg-violet-wash/60 p-4">
            <JoinCodeForm />
          </section>
        )}
      </div>

      <LanguageSwitch className="mt-auto pt-8" />
    </SplashFrame>
  );
}
