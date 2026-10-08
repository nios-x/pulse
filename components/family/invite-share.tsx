"use client";

import { useState } from "react";
import { CopyIcon, MessageCircleIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";

/** A fresh invite: the code in large type, Send on WhatsApp and Copy link. */
export function InviteShare({ code, url, whatsapp }: { code: string; url: string; whatsapp: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/40 bg-secondary p-4" role="status">
      <p className="text-base">{t("invite.codeReady")}</p>
      <p className="font-mono text-4xl font-bold tracking-[0.3em] text-primary" aria-label={code.split("").join(" ")}>
        {code}
      </p>
      <p className="text-sm text-muted-foreground">{t("invite.expires")}</p>
      <a
        href={whatsapp}
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
            await navigator.clipboard.writeText(url);
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
  );
}
