"use client";

import { useActionState } from "react";
import { HeartHandshakeIcon, StethoscopeIcon } from "lucide-react";
import { signInAction, signUpAction } from "@/app/auth/actions";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Role } from "@/db/schema";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

/**
 * Sign-in and sign-up. With an invite code, sign-up opens first and joins that care team.
 * Without one, the person picks a family account (their own health profile) or a doctor account.
 */
export function AuthForms({
  next,
  inviteCode,
  inviteRole,
  defaultTab,
}: {
  next: string;
  inviteCode: string | null;
  inviteRole: Role | null;
  defaultTab: "signin" | "signup";
}) {
  const t = useT();
  const [signIn, signInFormAction, signInPending] = useActionState<FormState, FormData>(
    signInAction,
    {}
  );
  const [signUp, signUpFormAction, signUpPending] = useActionState<FormState, FormData>(
    signUpAction,
    {}
  );
  const err = (key?: MessageKey) => (key ? t(key) : undefined);

  const clinicField = (
    <TextField
      name="clinic"
      autoComplete="organization"
      label={t("auth.clinic")}
      hint={t("auth.clinicHint")}
      defaultValue={signUp.values?.clinic}
      error={err(signUp.fieldErrors?.clinic)}
      maxLength={80}
    />
  );

  const signInForm = (
    <form action={signInFormAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage>{err(signIn.error)}</FormMessage>
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        label={t("auth.email")}
        defaultValue={signIn.values?.email}
        error={err(signIn.fieldErrors?.email)}
        required
      />
      <TextField
        name="password"
        type="password"
        autoComplete="current-password"
        label={t("auth.password")}
        error={err(signIn.fieldErrors?.password)}
        required
      />
      <Button type="submit" size="xl" disabled={signInPending} className="mt-2">
        {signInPending ? t("common.wait") : t("auth.signIn")}
      </Button>
    </form>
  );

  return (
    <Tabs defaultValue={defaultTab} className="gap-5">
      <TabsList className="h-12! w-full">
        <TabsTrigger value="signup" className="text-base">
          {t("auth.createAccount")}
        </TabsTrigger>
        <TabsTrigger value="signin" className="text-base">
          {t("auth.signIn")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="signin">{signInForm}</TabsContent>

      <TabsContent value="signup">
        <form action={signUpFormAction} className="group/signup flex flex-col gap-4" noValidate>
          <input type="hidden" name="next" value={next} />
          {inviteCode ? <input type="hidden" name="code" value={inviteCode} /> : null}
          <FormMessage>{err(signUp.error)}</FormMessage>
          {inviteCode ? null : (
            <ChoiceChips
              name="accountType"
              legend={t("auth.accountType")}
              defaultValue={signUp.values?.accountType === "doctor" ? "doctor" : "family"}
              columns={2}
              options={[
                {
                  value: "family",
                  icon: <HeartHandshakeIcon className="size-5" aria-hidden />,
                  label: t("auth.accountType.family"),
                  description: t("auth.accountType.familyHint"),
                },
                {
                  value: "doctor",
                  icon: <StethoscopeIcon className="size-5" aria-hidden />,
                  label: t("auth.accountType.doctor"),
                  description: t("auth.accountType.doctorHint"),
                },
              ]}
            />
          )}
          <TextField
            name="name"
            autoComplete="name"
            label={t("auth.name")}
            defaultValue={signUp.values?.name}
            error={err(signUp.fieldErrors?.name)}
            required
          />
          <TextField
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            label={t("auth.email")}
            defaultValue={signUp.values?.email}
            error={err(signUp.fieldErrors?.email)}
            required
          />
          <TextField
            name="password"
            type="password"
            autoComplete="new-password"
            label={t("auth.password")}
            hint={t("auth.passwordHint")}
            error={err(signUp.fieldErrors?.password)}
            minLength={8}
            required
          />
          <TextField
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            label={t("auth.phone")}
            hint={t("auth.phoneHint")}
            defaultValue={signUp.values?.phone}
            error={err(signUp.fieldErrors?.phone)}
          />
          {inviteRole === "doctor" ? (
            clinicField
          ) : inviteCode ? null : (
            // Shown only while "Doctor" is picked; CSS, so it works before JavaScript loads.
            <div className="hidden group-has-[input[value=doctor]:checked]/signup:block">{clinicField}</div>
          )}
          <Button type="submit" size="xl" disabled={signUpPending} className="mt-2">
            {signUpPending ? t("common.wait") : t("auth.createAccount")}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
