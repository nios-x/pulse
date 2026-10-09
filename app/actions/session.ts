"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { destroySession } from "@/lib/auth";
import { getContext } from "@/lib/context";
import { isRole } from "@/lib/permissions";
import { VIEW_AS_COOKIE } from "@/lib/session-cookie";

export async function signOutAction() {
  await destroySession();
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect("/sign-in");
}

/** Demo-only: an admin previews the app as another role. The server applies that role for real. */
export async function setViewAs(role: string | null) {
  const ctx = await getContext();
  const store = await cookies();
  if (ctx.actualRole !== "admin" || !role || role === "admin" || !isRole(role)) {
    store.delete(VIEW_AS_COOKIE);
  } else {
    store.set(VIEW_AS_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  }
  revalidatePath("/", "layout");
}

export async function markNotificationsRead() {
  const ctx = await getContext();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.familyId, ctx.family.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
}
