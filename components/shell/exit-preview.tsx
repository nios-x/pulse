"use client";

import { useTransition } from "react";
import { setViewAsAction } from "@/app/actions/view-as";
import { useT } from "@/components/i18n-provider";
import { toast } from "@/components/ui/toast";

export function ExitPreviewButton() {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setViewAsAction({ role: null });
          toast.add({ type: "info", title: t("viewAs.reset") });
        })
      }
      className="min-h-11 rounded-lg px-2 font-semibold underline decoration-sage/50 underline-offset-4 hover:decoration-sage"
    >
      {t("viewAs.exit")}
    </button>
  );
}
