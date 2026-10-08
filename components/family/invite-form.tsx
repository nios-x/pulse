"use client";

import { useActionState, useState } from "react";
import { CopyIcon, MessageCircleIcon, SendIcon } from "lucide-react";
import { createInviteAction } from "@/app/(app)/p/[patientId]/family/actions";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage } from "@/components/form/text-field";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Role, Scope } from "@/db/schema";
import type { FormState } from "@/lib/validators";

const DEFAULT_SCOPES: Record<Role, Scope[]> = {
  owner: ["vitals", "meds", "meals", "mood"],
  caregiver: ["vitals", "meds", "meals"],
  family: ["meals"],
};

export function InviteForm({
  patientId,
  patientName,
  allowOwner,
  canShareMood,
}: {
  patientId: string;
  patientName: string;
  allowOwner: boolean;
  canShareMood: boolean;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(createInviteAction, {});
  const [role, setRole] = useState<Role>(allowOwner ? "owner" : "caregiver");
  const [copied, setCopied] = useState(false);

  const scopeOptions = (["vitals", "meds", "meals", "mood"] as const)
    .filter((s) => s !== "mood" || canShareMood)
    .map((s) => ({ value: s, label: t(`scope.${s}`) }));

  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className="flex flex-col gap-4"
        onChange={(e) => {
          const target = e.target as unknown as HTMLInputElement;
          if (target.name === "role") setRole(target.value as Role);
        }}
      >
        <input type="hidden" name="patientId" value={patientId} />
        <ChoiceChips
          name="role"
          legend={t("invite.who")}
          defaultValue={role}
          columns={allowOwner ? 3 : 2}
          chipClassName="justify-center text-center"
          options={[
            ...(allowOwner ? [{ value: "owner", label: t("invite.asPatient", { name: patientName }) }] : []),
            { value: "caregiver", label: t("role.caregiver") },
            { value: "family", label: t("role.family") },
          ]}
        />
        {role === "owner" ? (
          <p className="text-sm text-muted-foreground">{t("invite.ownerNote", { name: patientName })}</p>
        ) : (
          <ChoiceChips
            key={role}
            name="scopes"
            type="checkbox"
            legend={t("invite.canSee")}
            defaultValue={DEFAULT_SCOPES[role]}
            columns={2}
            options={scopeOptions}
          />
        )}
        <FormMessage>{state.error ? t(state.error) : undefined}</FormMessage>
        <Button type="submit" size="xl" disabled={pending}>
          <SendIcon aria-hidden />
          {pending ? t("common.wait") : t("invite.create")}
        </Button>
      </form>

      {state.ok && state.values?.code ? (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/40 bg-secondary p-4" role="status">
          <p className="text-base">{t("invite.codeReady")}</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-primary" aria-label={state.values.code.split("").join(" ")}>
            {state.values.code}
          </p>
          <p className="text-sm text-muted-foreground">{t("invite.expires")}</p>
          <a
            href={state.values.whatsapp}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "xl", className: "bg-[#1f8f4e] text-white hover:bg-[#1f8f4e]/90" })}
          >
            <MessageCircleIcon aria-hidden />
            {t("invite.whatsapp")}
          </a>
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.values?.url ?? "");
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <CopyIcon aria-hidden />
            {copied ? t("invite.copied") : t("invite.copyLink")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
