import Link from "next/link";
import { LogOut, Stethoscope } from "lucide-react";
import { signOutAction } from "@/app/actions/session";
import { Logo, LogoMark } from "@/components/brand/logo";
import { DoctorNav } from "@/components/doctor/doctor-nav";
import { MemberAvatar } from "@/components/health/member-avatar";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { getDoctorContext } from "@/lib/doctor";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { doctor } = await getDoctorContext();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-6 border-r border-sidebar-border bg-sidebar py-5 lg:flex">
        <Link href="/doctor" className="mx-5 rounded-lg" aria-label="Pulse for doctors"><Logo subtitle={false} /></Link>
        <DoctorNav variant="side" />
        <div className="mt-auto px-3">
          <div className="rounded-2xl bg-brand-soft p-3.5 text-sm">
            <p className="font-semibold text-accent-foreground">Pulse for doctors</p>
            <p className="text-muted-foreground">Families share with you by consent, for a limited time.</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/doctor" className="lg:hidden" aria-label="Pulse for doctors"><LogoMark /></Link>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 text-sm font-semibold text-accent-foreground"><Stethoscope className="size-4" aria-hidden="true" /> Doctor</span>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <MemberAvatar name={doctor.name.replace(/^Dr\.?\s*/i, "")} tone={6} size="sm" className="size-9" />
              <form action={signOutAction}><Button variant="ghost" size="sm" type="submit"><LogOut aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span></Button></form>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">{children}</main>
      </div>
      <DoctorNav variant="bottom" />
    </div>
  );
}
