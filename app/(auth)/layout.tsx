import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, Check, Droplet, HeartPulse, Lock, ShieldCheck, Siren, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth";

const POINTS = [
  { icon: Users, title: "Everyone's health in one calm place", body: "Records, medicines, appointments and vitals for parents, kids and you." },
  { icon: ShieldCheck, title: "The right access for each person", body: "Admins, caregivers, members and viewers each see only what they should." },
  { icon: Siren, title: "Ready for an emergency", body: "A high-contrast card with blood group, allergies and a QR code, readable in 3 seconds." },
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="w-fit rounded-lg" aria-label="Pulse home">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden="true" /> Records are encrypted. You decide who sees what, and for how long.
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand text-brand-foreground lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="relative max-w-lg space-y-4">
          <h2 className="font-heading text-[2.6rem] leading-[1.08] font-bold text-balance text-inherit">One place for your whole family&apos;s health.</h2>
          <p className="text-lg text-brand-foreground/85">For the person who looks after everyone.</p>
        </div>

        {/* Product preview, built from real UI pieces */}
        <div className="relative my-10 grid max-w-lg grid-cols-[1.1fr_1fr] gap-4" aria-hidden="true">
          <div className="space-y-3 rounded-2xl bg-card p-5 text-card-foreground shadow-pop">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-avatar-2 text-sm font-semibold text-avatar-ink">SM</span>
              <div>
                <p className="text-base font-semibold">Suresh Mehta</p>
                <p className="text-sm text-muted-foreground">Father · 68 yrs</p>
              </div>
              <span className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-border px-2 text-sm font-semibold">
                <Droplet className="size-3.5" /> B+
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface p-2.5">
                <p className="text-xs text-muted-foreground">BP</p>
                <p className="text-base font-semibold tabular">128/82</p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-soft px-1.5 text-xs font-medium text-warning">
                  <HeartPulse className="size-3" /> Elevated
                </p>
              </div>
              <div className="rounded-lg bg-surface p-2.5">
                <p className="text-xs text-muted-foreground">Sugar</p>
                <p className="text-base font-semibold tabular">118</p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-success-border bg-success-soft px-1.5 text-xs font-medium text-success">
                  <Check className="size-3" /> Normal
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10 space-y-2.5 rounded-2xl bg-card p-4 text-card-foreground shadow-pop">
            <p className="text-sm font-semibold">Morning medicines</p>
            {["Glycomet 500 mg", "Telma 40 mg", "Thyronorm 50 mcg"].map((m, i) => (
              <div key={m} className="flex items-center gap-2.5">
                <span className={`flex size-7 items-center justify-center rounded-full border-2 ${i < 2 ? "border-success bg-success text-card" : "border-border-strong"}`}>
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <span className="text-sm">{m}</span>
              </div>
            ))}
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <BellRing className="size-3.5" /> Priya gets an email if a dose is missed
            </p>
          </div>
        </div>

        <ul className="relative max-w-lg space-y-5">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-foreground/15">
                <p.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold">{p.title}</p>
                <p className="text-[0.9375rem] opacity-85">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
