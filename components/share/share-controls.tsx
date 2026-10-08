"use client";

import { useActionState, useState, useTransition } from "react";
import { CopyIcon, ExternalLinkIcon, LinkIcon, MessageCircleIcon } from "lucide-react";
import {
  addLabAction,
  createShareLinkAction,
  revokeShareLinkAction,
} from "@/app/(app)/p/[patientId]/share/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { whatsappShareUrl } from "@/lib/whatsapp";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

export function LabForm({ patientId, today }: { patientId: string; today: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(addLabAction, {});
  const err = (key?: MessageKey) => (key ? t(key) : undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="value"
          label={t("share.hba1c")}
          inputMode="decimal"
          placeholder="7.2"
          defaultValue={state.ok ? "" : state.values?.value}
          error={err(state.fieldErrors?.value)}
          required
        />
        <TextField
          name="takenOn"
          type="date"
          label={t("share.takenOn")}
          max={today}
          defaultValue={state.ok ? today : (state.values?.takenOn ?? today)}
          error={err(state.fieldErrors?.takenOn)}
          required
        />
      </div>
      {state.ok ? <FormMessage tone="ok">{t("share.labSaved", { value: state.values?.value ?? "" })}</FormMessage> : null}
      <Button type="submit" size="touch" variant="secondary" disabled={pending}>
        {pending ? t("common.wait") : t("share.addLab")}
      </Button>
    </form>
  );
}

export function CreateLinkForm({
  patientId,
  origin,
  patientName,
  canIncludeMood,
  moodDefault,
}: {
  patientId: string;
  origin: string;
  patientName: string;
  canIncludeMood: boolean;
  moodDefault: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [includeMood, setIncludeMood] = useState(canIncludeMood && moodDefault);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {canIncludeMood ? (
        <label className="flex min-h-12 items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={includeMood}
            onChange={(e) => setIncludeMood(e.target.checked)}
            className="size-6 accent-primary"
          />
          {t("share.includeMood")}
        </label>
      ) : null}
      <Button
        size="xl"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setCopied(false);
            const result = await createShareLinkAction({ patientId, includeMood });
            if (result.ok) setUrl(`${origin}/share/${result.token}`);
          })
        }
      >
        <LinkIcon aria-hidden />
        {pending ? t("common.wait") : t("share.create")}
      </Button>
      {url ? (
        <div role="status" className="flex flex-col gap-3 rounded-xl border-2 border-primary/40 bg-secondary p-4">
          <p className="text-base">{t("share.ready")}</p>
          <p className="rounded-lg bg-card px-3 py-2 font-mono text-sm break-all">{url}</p>
          <a
            href={whatsappShareUrl(t("share.whatsappText", { name: patientName, url }))}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "touch", className: "bg-[#1f8f4e] text-white hover:bg-[#1f8f4e]/90" })}
          >
            <MessageCircleIcon aria-hidden />
            {t("invite.whatsapp")}
          </a>
          <div className="grid grid-cols-2 gap-2">
            <Button
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
            <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "touch" })}>
              <ExternalLinkIcon aria-hidden />
              {t("share.open")}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RevokeLinkButton({ patientId, linkId }: { patientId: string; linkId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="touch"
      disabled={pending}
      onClick={() => startTransition(async () => void (await revokeShareLinkAction({ patientId, linkId })))}
    >
      {t("share.revoke")}
    </Button>
  );
}
