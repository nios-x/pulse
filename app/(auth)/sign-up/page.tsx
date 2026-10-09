import type { Metadata } from "next";
import Link from "next/link";
import { Stethoscope, Users } from "lucide-react";
import { DoctorSignUpForm } from "@/components/auth/doctor-sign-up-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ invite?: string; as?: string }> }) {
  const { invite, as } = await searchParams;
  const doctor = as === "doctor";
  const tab = "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-[0.9375rem] font-semibold transition-colors";
  return (
    <div className="flex flex-col gap-7">
      <nav aria-label="Account type" className="flex rounded-xl bg-muted p-1">
        <Link href={`/sign-up${invite ? `?invite=${invite}` : ""}`} aria-current={!doctor ? "page" : undefined} className={cn(tab, !doctor ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground")}><Users className="size-4" aria-hidden="true" /> Family</Link>
        <Link href="/sign-up?as=doctor" aria-current={doctor ? "page" : undefined} className={cn(tab, doctor ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground")}><Stethoscope className="size-4" aria-hidden="true" /> Doctor</Link>
      </nav>
      <div className="space-y-2">
        <h1 className="font-heading text-[2rem] leading-tight font-extrabold">{doctor ? "Join Pulse as a doctor" : "Create your family account"}</h1>
        <p className="text-base text-muted-foreground">
          {doctor ? "Get bookings from families, see the home readings they choose to share, and leave notes they can follow." : "It takes about two minutes. You can add parents, children and caregivers next."}
        </p>
      </div>
      {doctor ? <DoctorSignUpForm /> : <SignUpForm invite={invite} />}
    </div>
  );
}
