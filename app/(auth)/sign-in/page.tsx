import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-[2rem] leading-tight font-semibold">Welcome back</h1>
        <p className="text-base text-muted-foreground">
          Sign in to see how your family is doing today. New here?{" "}
          <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
      <SignInForm next={next} />
      <p className="text-center text-[0.9375rem] text-muted-foreground">
        Are you a doctor?{" "}
        <Link href="/sign-up?as=doctor" className="font-medium text-accent-foreground underline-offset-4 hover:underline">Join Pulse as a doctor</Link>
      </p>
    </div>
  );
}
