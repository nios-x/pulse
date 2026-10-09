"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { families, members } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import { BLOOD_GROUPS } from "@/lib/labels";

const person = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  relation: z.enum(["self", "spouse", "parent", "child", "grandparent", "sibling", "other"]),
  role: z.enum(["admin", "caregiver", "member", "viewer"]),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  sex: z.enum(["female", "male", "other", ""]).optional(),
  bloodGroup: z.enum([...BLOOD_GROUPS, ""]).optional(),
});

const createInput = z.object({
  familyName: z.string().trim().min(2, "Give your family a name").max(60),
  city: z.string().trim().max(60).optional(),
  me: person.omit({ name: true, relation: true, role: true }),
  others: z.array(person).max(12),
});

export type OnboardingResult = { ok: false; error: string } | undefined;

export async function createFamilyAction(input: unknown): Promise<OnboardingResult> {
  const user = await requireUser();
  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.userId, user.id)).limit(1);
  if (existing) redirect("/dashboard");
  const d = parsed.data;
  const familyId = await db.transaction(async (tx) => {
    const [fam] = await tx.insert(families).values({ name: d.familyName, city: d.city || null, createdBy: user.id }).returning({ id: families.id });
    const [me] = await tx
      .insert(members)
      .values({
        familyId: fam.id,
        userId: user.id,
        name: user.name,
        relation: "self",
        role: "admin",
        dateOfBirth: d.me.dateOfBirth || null,
        sex: d.me.sex || null,
        bloodGroup: d.me.bloodGroup || null,
        avatarTone: 1,
      })
      .returning({ id: members.id });
    if (d.others.length) {
      const rows = await tx
        .insert(members)
        .values(
          d.others.map((o, i) => ({
            familyId: fam.id,
            name: o.name,
            relation: o.relation === "self" ? ("other" as const) : o.relation,
            role: o.role,
            dateOfBirth: o.dateOfBirth || null,
            sex: o.sex || null,
            bloodGroup: o.bloodGroup || null,
            avatarTone: 2 + (i % 5),
          }))
        )
        .returning({ id: members.id, relation: members.relation });
      // The admin looks after parents and children by default (used for caregiver previews).
      await tx.update(members).set({ assignedMemberIds: rows.filter((r) => r.relation !== "spouse").map((r) => r.id) }).where(eq(members.id, me.id));
    }
    return fam.id;
  });
  await audit(familyId, user.id, "family.created", { name: d.familyName, members: d.others.length + 1 });
  redirect("/dashboard?welcome=1");
}

export async function joinFamilyAction(code: string): Promise<OnboardingResult> {
  const user = await requireUser();
  const res = await acceptInvite(code, user);
  if (!res.ok) return { ok: false, error: res.error };
  redirect("/dashboard?welcome=1");
}
