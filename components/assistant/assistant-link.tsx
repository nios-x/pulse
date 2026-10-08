import Link from "next/link";
import { ChevronRightIcon, SparklesIcon } from "lucide-react";
import { BlobBadge } from "@/components/shapes/shapes";
import { assistantEnabled } from "@/lib/gemini";
import { getT } from "@/lib/i18n-server";

/** "Questions about Pulse?" card that opens the assistant on this profile. */
export async function AssistantLink({ patientId, className }: { patientId: string | null; className?: string }) {
  if (!assistantEnabled()) return null;
  const { t } = await getT();
  return (
    <Link
      href={patientId ? `/assistant?p=${patientId}` : "/assistant"}
      className={`sheet flex min-h-16 items-center gap-4 rounded-2xl p-4 pr-5 transition-colors hover:bg-violet-wash/60 ${className ?? ""}`}
    >
      <BlobBadge seed={71} className="size-12">
        <SparklesIcon aria-hidden />
      </BlobBadge>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-heading text-base font-semibold text-plum">{t("assistant.cardTitle")}</span>
        <span className="text-sm text-ink-2">{t("assistant.cardBody")}</span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-ink-3" aria-hidden />
    </Link>
  );
}
