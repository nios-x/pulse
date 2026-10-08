"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPreview, MATRIX_COOKIE, VIEW_AS_COOKIE } from "@/lib/view-as";
import { encodeMatrix, isAppRole, MATRIX_ACTIONS, toggleMatrix, DEFAULT_MATRIX, type MatrixAction } from "@/lib/roles";

const COOKIE = { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" as const, httpOnly: true };

/** Demo only: preview the app as another role. Never changes what the server allows. */
export async function setViewAsAction(input: { role: string | null }) {
  await requireUser();
  const jar = await cookies();
  if (input.role && isAppRole(input.role)) jar.set(VIEW_AS_COOKIE, input.role, COOKIE);
  else jar.delete(VIEW_AS_COOKIE);
  refresh();
}

/** Demo only: one switch in the permissions matrix. Feeds the View-as preview. */
export async function toggleMatrixAction(input: { role: string; action: string; on: boolean }) {
  await requireUser();
  if (!isAppRole(input.role) || !(MATRIX_ACTIONS as readonly string[]).includes(input.action)) {
    return { ok: false as const };
  }
  const { matrix } = await getPreview();
  const next = toggleMatrix(matrix, input.role, input.action as MatrixAction, input.on);
  (await cookies()).set(MATRIX_COOKIE, encodeMatrix(next), COOKIE);
  refresh();
  return { ok: true as const };
}

export async function resetMatrixAction() {
  await requireUser();
  (await cookies()).set(MATRIX_COOKIE, encodeMatrix(DEFAULT_MATRIX), COOKIE);
  refresh();
}
