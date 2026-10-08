"use client";

import { useState, useTransition } from "react";
import { UserMinusIcon } from "lucide-react";
import {
  removeMemberAction,
  updateMemberRoleAction,
  updateMemberScopesAction,
} from "@/app/(app)/p/[patientId]/family/actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Scope } from "@/db/schema";
import type { MessageKey } from "@/lib/i18n";

const ALL_SCOPES: Scope[] = ["vitals", "meds", "meals", "mood"];

export function MemberControls({
  patientId,
  membershipId,
  name,
  role: initialRole,
  scopes: initialScopes,
  canToggleMood,
}: {
  patientId: string;
  membershipId: string;
  name: string;
  role: "caregiver" | "family";
  scopes: Scope[];
  canToggleMood: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(initialRole);
  const [scopes, setScopes] = useState(initialScopes);
  const [error, setError] = useState<MessageKey | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: MessageKey }>, undo: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) {
        undo();
        setError(result.error ?? "common.error");
      }
    });

  const toggle = (scope: Scope, on: boolean) => {
    const previous = scopes;
    const next = on ? [...scopes, scope] : scopes.filter((s) => s !== scope);
    setScopes(next);
    run(() => updateMemberScopesAction({ patientId, membershipId, scopes: next }), () => setScopes(previous));
  };

  return (
    <div className="flex flex-col gap-1 border-t pt-3" aria-busy={pending}>
      <label className="flex h-12 items-center justify-between gap-3 text-base">
        {t("family.role")}
        <select
          value={role}
          disabled={pending}
          onChange={(e) => {
            const previous = role;
            const next = e.target.value as "caregiver" | "family";
            setRole(next);
            run(() => updateMemberRoleAction({ patientId, membershipId, role: next }), () => setRole(previous));
          }}
          className="h-11 rounded-lg border bg-card px-3 text-base"
        >
          <option value="caregiver">{t("role.caregiver")}</option>
          <option value="family">{t("role.family")}</option>
        </select>
      </label>

      <p className="pt-1 text-sm font-medium text-muted-foreground">{t("family.canSee")}</p>
      {ALL_SCOPES.map((scope) => {
        const locked = scope === "mood" && !canToggleMood;
        return (
          <label
            key={scope}
            className="flex min-h-12 items-center justify-between gap-3 text-base"
            data-disabled={locked || undefined}
          >
            <span className="flex flex-col">
              {t(`scope.${scope}`)}
              {locked ? (
                <span className="text-sm text-muted-foreground">{t("family.moodOwnerOnly")}</span>
              ) : null}
            </span>
            <Switch
              checked={scopes.includes(scope)}
              disabled={locked || pending}
              onCheckedChange={(checked) => toggle(scope, checked)}
              aria-label={t(`scope.${scope}`)}
            />
          </label>
        );
      })}

      {error ? <p className="text-sm text-destructive">{t(error)}</p> : null}

      <Dialog>
        <DialogTrigger render={<Button variant="destructive" size="touch" className="mt-2 w-full" />}>
          <UserMinusIcon aria-hidden />
          {t("family.remove")}
        </DialogTrigger>
        <DialogContent closeLabel={t("common.close")}>
          <DialogTitle className="text-lg">{t("family.removeTitle", { name })}</DialogTitle>
          <DialogDescription className="text-base">{t("family.removeBody", { name })}</DialogDescription>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="touch" />}>{t("common.cancel")}</DialogClose>
            <Button
              variant="destructive"
              size="touch"
              disabled={pending}
              onClick={() =>
                run(() => removeMemberAction({ patientId, membershipId }), () => undefined)
              }
            >
              {t("family.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
