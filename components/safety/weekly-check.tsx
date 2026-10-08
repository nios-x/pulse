"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { HeartHandshakeIcon, SunIcon } from "lucide-react";
import {
  answerFollowUpAction,
  requestSupportAction,
  submitMoodAction,
} from "@/app/(app)/p/[patientId]/check/actions";
import { useLocale, useT } from "@/components/i18n-provider";
import { CallList } from "@/components/safety/call-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { HELPLINES, safetyText, type MoodOutcome, type SafetyCopyKey } from "@/lib/safety";
import { cn } from "@/lib/utils";

type Step = { name: "questions" } | { name: "followUp"; checkId: string } | { name: MoodOutcome };

const ANSWERS: SafetyCopyKey[] = ["mood_a0", "mood_a1", "mood_a2", "mood_a3"];

/**
 * The weekly two-question energy check (PHQ-2). Private to the patient:
 * a high score opens a help screen, never a family alert.
 */
export function WeeklyCheck({
  patientId,
  family,
}: {
  patientId: string;
  family: { name: string; phone: string | null }[];
}) {
  const t = useT();
  const locale = useLocale();
  const s = (key: SafetyCopyKey, vars?: Record<string, string>) => safetyText(key, locale, vars);
  const [step, setStep] = useState<Step>({ name: "questions" });
  const [answers, setAnswers] = useState<{ q1?: number; q2?: number }>({});
  const [pending, startTransition] = useTransition();
  const [told, setTold] = useState(false);
  const firstName = family[0]?.name;

  const teleManas = { label: t("help.callTeleManas"), number: HELPLINES.teleManas, hint: t("help.teleManasHint"), primary: true };

  if (step.name === "questions") {
    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (answers.q1 === undefined || answers.q2 === undefined) return;
          startTransition(async () => {
            const result = await submitMoodAction({ patientId, q1: answers.q1!, q2: answers.q2! });
            if (!result.ok) return;
            setStep(result.needsFollowUp ? { name: "followUp", checkId: result.checkId } : { name: "ok" });
          });
        }}
      >
        <div>
          <h1 className="text-[2rem] leading-tight">{s("mood_title")}</h1>
          <p className="mt-1 text-muted-foreground">{s("mood_intro")}</p>
        </div>
        {(["q1", "q2"] as const).map((q) => (
          <fieldset key={q} className="flex flex-col gap-2">
            <legend className="mb-2 text-lg leading-snug font-medium">{s(q === "q1" ? "mood_q1" : "mood_q2")}</legend>
            {ANSWERS.map((key, value) => (
              <label key={key} className="relative block">
                <input
                  type="radio"
                  name={q}
                  value={value}
                  checked={answers[q] === value}
                  onChange={() => setAnswers((a) => ({ ...a, [q]: value }))}
                  className="peer sr-only"
                />
                <span className="flex min-h-12 cursor-pointer items-center sheet rounded-xl px-4 text-base peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                  {s(key)}
                </span>
              </label>
            ))}
          </fieldset>
        ))}
        <Button type="submit" size="xl" disabled={pending || answers.q1 === undefined || answers.q2 === undefined}>
          {pending ? t("common.wait") : t("common.done")}
        </Button>
      </form>
    );
  }

  if (step.name === "followUp") {
    const answer = (yes: boolean) =>
      startTransition(async () => {
        const result = await answerFollowUpAction({ patientId, checkId: step.checkId, answer: yes });
        if (result.ok && result.outcome) setStep({ name: result.outcome });
      });
    return (
      <div className="flex flex-col gap-6">
        <p className="text-xl leading-snug font-medium">{s("mood_follow_up")}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button size="xl" variant="outline" disabled={pending} onClick={() => answer(true)}>
            {t("common.yes")}
          </Button>
          <Button size="xl" variant="outline" disabled={pending} onClick={() => answer(false)}>
            {t("common.no")}
          </Button>
        </div>
      </div>
    );
  }

  if (step.name === "ok") {
    return (
      <div className="flex flex-col items-start gap-4">
        <SunIcon className="size-12 text-watch" aria-hidden />
        <p className="text-xl">{s("mood_ok")}</p>
        <Link href={`/home?p=${patientId}`} className={buttonVariants({ size: "xl" })}>
          {t("forbidden.home")}
        </Link>
      </div>
    );
  }

  if (step.name === "support") {
    return (
      <div className="flex flex-col gap-5">
        <HeartHandshakeIcon className="size-12 text-primary" aria-hidden />
        <p className="text-xl leading-snug">{s("mood_support")}</p>
        <CallList items={[teleManas]} />
        <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
          <p className="text-base font-medium">{s("mood_add_to_doctor")}</p>
          <Link
            href={`/p/${patientId}/share?includeMood=1`}
            className={buttonVariants({ size: "touch", variant: "outline" })}
          >
            {t("check.addToDoctor")}
          </Link>
        </div>
        <Link href={`/home?p=${patientId}`} className={buttonVariants({ size: "touch", variant: "ghost" })}>
          {t("forbidden.home")}
        </Link>
      </div>
    );
  }

  // Crisis: full screen, help one tap away, ask before telling anyone.
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="crisis-title" className="fixed inset-0 z-50 overflow-y-auto bg-primary px-5 py-10 text-primary-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <HeartHandshakeIcon className="size-14" aria-hidden />
        <h1 id="crisis-title" className="text-3xl leading-tight font-bold">
          {s("crisis_title")}
        </h1>
        <p className="text-xl">{s("crisis_body")}</p>
        <CallList
          className="[&_a]:border-white [&_a]:bg-white [&_a]:text-primary"
          items={[
            teleManas,
            { label: t("help.call112"), number: HELPLINES.emergency },
            ...family.filter((f) => f.phone).map((f) => ({ label: t("alert.call", { name: f.name }), number: f.phone! })),
          ]}
        />
        {firstName ? (
          <div className="flex flex-col gap-3 rounded-xl bg-white/10 p-4">
            {told ? (
              <p className="text-lg" role="status">
                {s("crisis_told", { name: firstName })}
              </p>
            ) : (
              <>
                <p className="text-lg font-medium">{s("crisis_tell_family", { name: firstName })}</p>
                <Button
                  size="xl"
                  disabled={pending}
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await requestSupportAction({ patientId });
                      if (result.ok) setTold(true);
                    })
                  }
                >
                  {t("check.tellFamily", { name: firstName })}
                </Button>
              </>
            )}
          </div>
        ) : null}
        <Link
          href={`/home?p=${patientId}`}
          className={cn(buttonVariants({ size: "touch", variant: "ghost" }), "text-primary-foreground underline hover:bg-white/10 hover:text-primary-foreground")}
        >
          {t("forbidden.home")}
        </Link>
      </div>
    </div>
  );
}
