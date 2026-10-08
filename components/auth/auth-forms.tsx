"use client";

import { useActionState } from "react";
import { signInAction, signUpAction } from "@/app/auth/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

export function AuthForms({ next, defaultTab }: { next: string; defaultTab: "signin" | "signup" }) {
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

  return (
    <Tabs defaultValue={defaultTab} className="gap-5">
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
          <Button type="submit" size="xl" disabled={signInPending} className="mt-2">
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
