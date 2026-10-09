import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { Logo } from "@/components/brand/logo";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Set up your family" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.userId, user.id)).limit(1);
  if (m) redirect("/dashboard");
  return (
    <div className="min-h-dvh px-5 py-6 sm:px-10">
      <Link href="/" className="inline-flex rounded-lg" aria-label="Pulse home"><Logo /></Link>
      <main className="mx-auto w-full max-w-2xl py-10 sm:py-16">
        <OnboardingWizard userName={user.name} />
      </main>
    </div>
  );
}
