import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-[2rem] leading-tight font-semibold">Create your family account</h1>
        <p className="text-base text-muted-foreground">It takes about two minutes. You can add parents, children and caregivers next.</p>
      </div>
      <SignUpForm invite={invite} />
    </div>
  );
}
