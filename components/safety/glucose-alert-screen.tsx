"use client";

import { useEffect, useRef } from "react";
import { PhoneIcon, TriangleAlertIcon } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { HELPLINES, safetyText, type SafetyResult } from "@/lib/safety";
import { cn } from "@/lib/utils";

/** Full-screen message after a dangerous reading. Calls use tel: links. */
export function GlucoseAlertScreen({
  alert,
  contacts,
  onClose,
}: {
  alert: SafetyResult & { mgdl: number };
  contacts: { name: string; phone: string; doctor: boolean }[];
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const urgent = alert.severity === "urgent";
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="glucose-alert-title"
      aria-describedby="glucose-alert-body"
      className={cn(
        "fixed inset-0 z-50 flex flex-col overflow-y-auto px-5 pt-10 pb-8",
        urgent ? "bg-destructive text-white" : "bg-warning text-warning-foreground"
      )}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5">
        <TriangleAlertIcon className="size-14" aria-hidden />
        <h2 id="glucose-alert-title" ref={titleRef} tabIndex={-1} className="text-5xl font-bold tabular-nums outline-none">
          {alert.mgdl} <span className="text-2xl font-semibold">mg/dL</span>
        </h2>
        <p id="glucose-alert-body" className="text-2xl leading-snug font-semibold">
          {safetyText(alert.kind, locale)}
        </p>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          {urgent ? (
            <a
              href={`tel:${HELPLINES.ambulance}`}
              className={buttonVariants({ size: "xl", className: "h-16 bg-white text-destructive hover:bg-white/90" })}
            >
              <PhoneIcon aria-hidden />
              {t("alert.call", { name: HELPLINES.ambulance })}
            </a>
          ) : null}
          {contacts.map((c) => (
            <a
              key={c.phone}
              href={`tel:${c.phone}`}
              className={buttonVariants({
                size: "xl",
                variant: "outline",
                className: cn("h-16 border-2 bg-transparent", urgent ? "border-white text-white hover:bg-white/10" : "border-current hover:bg-black/5"),
              })}
            >
              <PhoneIcon aria-hidden />
              {c.doctor ? t("alert.callDoctor", { name: c.name }) : t("alert.call", { name: c.name })}
            </a>
          ))}
          <Button
            size="xl"
            variant="ghost"
            onClick={onClose}
            className={cn("h-14 underline", urgent ? "text-white hover:bg-white/10 hover:text-white" : "hover:bg-black/5")}
          >
            {t("alert.understood")}
          </Button>
        </div>
      </div>
    </div>
  );
}
