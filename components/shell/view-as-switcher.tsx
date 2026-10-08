"use client";

import { useTransition } from "react";
import { ChevronDownIcon, EyeIcon } from "lucide-react";
import { setViewAsAction } from "@/app/actions/view-as";
import { useT } from "@/components/i18n-provider";
import { toast } from "@/components/ui/toast";
import { APP_ROLES, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * Demo-only: preview the app as another role so judges can watch buttons lock
 * and unlock. A native select under a styled chip: keyboard and screen readers
 * get the real control.
 */
export function ViewAsSwitcher({
  viewAs,
  realRole,
  compact = false,
}: {
  viewAs: AppRole | null;
  realRole: AppRole | null;
  compact?: boolean;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const current = viewAs ?? "";

  return (
    <label
      className={cn(
        "relative flex h-11 items-center gap-2 rounded-xl border px-3 text-[0.9375rem] font-medium transition-colors focus-within:ring-3 focus-within:ring-ring/50",
        viewAs
          ? "border-sage/40 bg-sage-wash text-sage-deep"
          : "border-edge-strong bg-sheet text-ink-2 hover:bg-well",
        pending && "opacity-70"
      )}
    >
      <EyeIcon className="size-[1.125rem] shrink-0" aria-hidden />
      <span className={cn("whitespace-nowrap", compact && "sr-only")}>
        {t("viewAs.label")}
        <span className="text-ink">: {viewAs ? t(`approle.${viewAs}`) : t("viewAs.me")}</span>
      </span>
      <ChevronDownIcon className="size-4 shrink-0 opacity-70" aria-hidden />
      <select
        value={current}
        disabled={pending}
        aria-label={t("viewAs.aria")}
        onChange={(e) => {
          const role = e.target.value || null;
          start(async () => {
            await setViewAsAction({ role });
            toast.add({
              type: "info",
              title: role ? t("viewAs.changed", { role: t(`approle.${role as AppRole}`) }) : t("viewAs.reset"),
            });
          });
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">
          {realRole ? t("viewAs.meWithRole", { role: t(`approle.${realRole}`) }) : t("viewAs.me")}
        </option>
        {APP_ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`approle.${r}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
