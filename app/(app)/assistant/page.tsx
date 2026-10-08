import { SparklesIcon } from "lucide-react";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { assistantEnabled } from "@/lib/gemini";
import type { MessageKey } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { listMyPatients } from "@/lib/patients";

const FAMILY_SUGGESTIONS: MessageKey[] = [
  "assistant.ask.lastReading",
  "assistant.ask.dosesToday",
  "assistant.ask.addMedicine",
  "assistant.ask.bookDoctor",
  "assistant.ask.invite",
];
const DOCTOR_SUGGESTIONS: MessageKey[] = [
  "assistant.ask.doctorCalls",
  "assistant.ask.lastReading",
  "assistant.ask.doctorJoin",
];

/** Pulse Assistant: answers questions about using Pulse and reads back the open profile's logs. */
export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const user = await requireUser();
  const { t } = await getT();
  const { p } = await searchParams;
  const mine = await listMyPatients(user.id);
  // Only a profile this person belongs to; the action checks permissions again.
  const active = mine.find((x) => x.id === p) ?? (user.isDoctor ? null : (mine[0] ?? null));

  return (
    <AppShell patient={active}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="flex items-center gap-2 text-[2rem] leading-tight">
            <SparklesIcon className="size-6 text-violet" aria-hidden />
            {t("assistant.title")}
          </h1>
          <p className="mt-1 text-base text-ink-2">
            {active ? t("assistant.subtitleFor", { name: active.name }) : t("assistant.subtitle")}
          </p>
          <p className="mt-2 rounded-xl bg-well px-3 py-2 text-sm text-ink-2">{t("assistant.notDoctor")}</p>
        </div>
        {assistantEnabled() ? (
          <AssistantChat
            patientId={active?.id ?? null}
            suggestions={user.isDoctor ? DOCTOR_SUGGESTIONS : FAMILY_SUGGESTIONS}
          />
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-edge-strong bg-card/50 px-4 py-6 text-center text-ink-3">
            {t("assistant.error.off")}
          </p>
        )}
      </div>
    </AppShell>
  );
}
