"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { triageSessions } from "@/db/schema";
import { runAction, type ActionResult } from "@/lib/action";
import { aiEnabled } from "@/lib/ai";
import { getContext, requireCan } from "@/lib/context";
import { ageFrom } from "@/lib/dates";
import { firstName } from "@/lib/labels";
import { notify } from "@/lib/notify";
import { runTriage, type TriageResult } from "@/lib/triage/engine";
import { triageSchema } from "@/lib/validators";

export async function triageAction(input: unknown): Promise<ActionResult<TriageResult>> {
  return runAction(async () => {
    const ctx = await getContext();
    const data = triageSchema.parse(input);
    requireCan(ctx, "triage.use", data.memberId);
    const member = ctx.members.find((m) => m.id === data.memberId)!;
    const result = await runTriage(
      {
        symptoms: data.symptoms,
        flags: data.flags,
        ageYears: ageFrom(member.dateOfBirth),
        durationDays: data.durationDays ?? null,
        severity: data.severity ?? null,
        temperatureF: data.temperatureF ?? null,
        pregnant: data.pregnant,
        knownAllergies: member.allergies.map((a) => a.name),
        language: data.language,
      },
      member,
      { useAi: aiEnabled() }
    );
    const [row] = await db
      .insert(triageSessions)
      .values({
        memberId: member.id,
        symptoms: data.symptoms,
        answers: { flags: data.flags, durationDays: data.durationDays, severity: data.severity, temperatureF: data.temperatureF },
        level: result.level,
        redFlags: result.redFlags.map((f) => f.code),
        source: result.source,
        language: data.language.slice(0, 8),
        result: { summary: result.summary, whatToDo: result.whatToDo, watchFor: result.watchFor },
        createdBy: ctx.user.id,
      })
      .returning({ id: triageSessions.id });
    if (result.level === "emergency" || result.level === "urgent") {
      await notify({
        familyId: ctx.family.id,
        memberId: member.id,
        kind: "triage",
        severity: result.level === "emergency" ? "urgent" : "warning",
        title: `${firstName(member.name)}: ${result.level === "emergency" ? "emergency signs in symptom check" : "should see a doctor today"}`,
        body: `${firstName(ctx.user.name)} ran a symptom check for ${member.name}. ${result.redFlags[0]?.reason ?? result.action}`,
        href: `/triage?member=${member.id}`,
        dedupeKey: `triage-${row.id}`,
      });
    }
    revalidatePath("/triage");
    return { ok: true, data: result };
  });
}
