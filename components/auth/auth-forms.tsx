"use client";

import { useState, useActionState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { resetPasswordAction, signInAction, signUpAction } from "@/app/auth/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

export function AuthForms({
  next,
  defaultTab,
}: {
  next: string;
  defaultTab: "signin" | "signup" | "forgot";
}) {
  const t = useT();
  const [showForgot, setShowForgot] = useState(defaultTab === "forgot");

  const [signIn, signInFormAction, signInPending] = useActionState<FormState, FormData>(
    signInAction,
    {}
  );
  const [signUp, signUpFormAction, signUpPending] = useActionState<FormState, FormData>(
    signUpAction,
    {}
  );
  const [reset, resetFormAction, resetPending] = useActionState<FormState, FormData>(
    resetPasswordAction,
    {}
  );

  const err = (key?: MessageKey) => (key ? t(key) : undefined);

  if (showForgot) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowForgot(false)}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            <ArrowLeftIcon className="size-4" />
            {t("auth.backToSignIn")}
          </button>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t("auth.resetPasswordTitle")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("auth.resetPasswordSubtitle")}
            </p>
          </div>

          <form action={resetFormAction} className="flex flex-col gap-4" noValidate>
            <input type="hidden" name="next" value={next} />
            <FormMessage>{err(reset.error)}</FormMessage>

            <TextField
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              label={t("auth.email")}
              defaultValue={reset.values?.email}
              error={err(reset.fieldErrors?.email)}
              required
            />

            <TextField
              name="password"
              type="password"
              autoComplete="new-password"
              label={t("auth.newPassword")}
              hint={t("auth.passwordHint")}
              error={err(reset.fieldErrors?.password)}
              minLength={8}
              required
            />

            <TextField
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              label={t("auth.confirmPassword")}
              error={err(reset.fieldErrors?.confirmPassword)}
              minLength={8}
              required
            />

            <Button type="submit" size="xl" disabled={resetPending} className="mt-2">
              {resetPending ? t("common.wait") : t("auth.resetPasswordSubmit")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab === "signup" ? "signup" : "signin"} className="gap-5">
      <TabsList className="h-12! w-full">
        <TabsTrigger value="signin" className="text-base">
          {t("auth.signIn")}
        </TabsTrigger>
        <TabsTrigger value="signup" className="text-base">
          {t("auth.createAccount")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="signin">
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
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <Button type="submit" size="xl" disabled={signInPending} className="mt-1">
            {signInPending ? t("common.wait") : t("auth.signIn")}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup">
        <form action={signUpFormAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="next" value={next} />
          <FormMessage>{err(signUp.error)}</FormMessage>
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
          <Button type="submit" size="xl" disabled={signUpPending} className="mt-2">
            {signUpPending ? t("common.wait") : t("auth.createAccount")}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
