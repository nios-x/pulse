"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { redeemInvite } from "@/lib/join";
import { inviteCodeSchema, readForm, type FormState } from "@/lib/validators";

export async function acceptInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = inviteCodeSchema.safeParse(readForm(formData, ["code"]).code);
  if (!parsed.success) return { error: "join.error.invalid" };

  const result = await db.transaction((tx) => redeemInvite(tx, parsed.data, user.id));
  if (result.error) return { error: result.error };
  redirect(`/home?p=${result.patientId}`);
}
