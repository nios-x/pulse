import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "pulse_session";
const SESSION_DAYS = 30;

export type CurrentUser = { id: string; name: string; email: string; phone: string | null };

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Only call from a Server Action or Route Handler: it sets a cookie. */
export async function createSession(userId: string): Promise<void> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user, or null if the cookie is missing or the session expired. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  return row ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  return user;
}

/** Only call from a Server Action: deletes the session row and the cookie. */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, token));
  store.delete(SESSION_COOKIE);
}
