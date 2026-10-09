import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Flower2,
  Sprout,
  TrendingUp,
  BellRing,
  CalendarCheck,
  Check,
  Droplet,
  Eye,
  FileHeart,
  FileScan,
  HeartHandshake,
  HeartPulse,
  Languages,
  Link2,
  Lock,
  Mic,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Fruit, FruitScatter } from "@/components/fruits/fruit";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: { absolute: "Pulse · One place for your family's health" } };

const FEATURES = [
  { icon: Sprout, title: "Streaks, quests and rewards", body: "Daily quests, a streak that grows like a fruit tree, badges and a family leaderboard make healthy habits something to look forward to." },
  { icon: TrendingUp, title: "See it working", body: "A personalized plan for each person and a chart that shows their health score, BP and sugar before and after they started." },
  { icon: Flower2, title: "PCOS care", body: "A doctor-first PCOS companion: daily plan by pattern, cycle tracking without 28-day pressure, symptoms and carb-pairing tips." },
  { icon: Pill, title: "Medicine reminders", body: "A morning, afternoon and night checklist for everyone, with a taken and missed log, refill warnings and email nudges to whoever's caring." },
  { icon: HeartPulse, title: "Vitals with context", body: "BP, sugar and weight charts with the usual range shaded in, so a number means something. Always labelled in words, not just colour." },
  { icon: FileHeart, title: "Records that travel", body: "Lab reports, prescriptions and scans on one timeline, encrypted, and ready to show any doctor in seconds." },
  { icon: CalendarCheck, title: "Doctors on Pulse", body: "Book clinic visits or video consults. Doctors get their own portal, see what you choose to share, and leave notes you can follow." },
  { icon: Siren, title: "Emergency card", body: "Blood group, allergies, conditions, medicines and contacts on a high-contrast card with a QR code. Readable in three seconds." },
  { icon: ShieldCheck, title: "Roles for real families", body: "Admin, caregiver, member and viewer. Parents see their own profile, a caregiver sees only the people they look after." },
];

const AI = [
  { icon: Stethoscope, title: "Symptom triage with a safety layer", body: "Hard-coded red-flag rules run first: chest pain with sweating is an emergency before any AI is asked. The result is a level of urgency, never a diagnosis." },
  { icon: FileScan, title: "Prescription scanner", body: "Photograph the doctor's handwriting. AI reads the medicines and the 1-0-1 dosing, you check every line, and reminders are set up for you." },
  { icon: Mic, title: "Voice first, in your language", body: "Speak symptoms in Hindi, Marathi, Tamil, Bengali and more. Advice and medicine lists can be read aloud for older parents." },
  { icon: ShieldAlert, title: "Interaction checker and generics", body: "Spots risky combinations like Brufen with daily Ecosprin, and same-ingredient duplicates. Shows cheaper generic options too." },
];

export default async function Landing() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-lg" aria-label="Pulse home"><Logo /></Link>
          <nav aria-label="Main" className="flex items-center gap-2">
            <a href="#features" className="hidden h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground md:inline-flex">Features</a>
            <a href="#safety" className="hidden h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground md:inline-flex">Responsible AI</a>
            <a href="#privacy" className="hidden h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground md:inline-flex">Privacy</a>
            {user ? (
              <Link href="/dashboard" className={buttonVariants()}>Open dashboard <ArrowRight aria-hidden="true" /></Link>
            ) : (
              <>
                <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
                <Link href="/sign-up" className={cn(buttonVariants(), "hidden sm:inline-flex")}>Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground">
              <HeartHandshake className="size-4 text-primary" aria-hidden="true" /> For the person who looks after everyone
            </p>
            <h1 className="font-heading text-[2.6rem] leading-[1.05] font-extrabold tracking-tight sm:text-[3.5rem]">
              Healthy habits the whole family <span className="text-brand">actually enjoys</span>.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Records, medicines, appointments and emergency info for parents, kids and you, with the right access for each person. Built for Indian families, readable by grandparents.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-in" className={buttonVariants({ size: "xl" })}>Try the demo family <ArrowRight aria-hidden="true" /></Link>
              <Link href="/sign-up" className={buttonVariants({ size: "xl", variant: "outline" })}>Create your family</Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-muted-foreground">
              {["Free to start", "Encrypted records", "Works on any phone"].map((t) => (
                <li key={t} className="inline-flex items-center gap-2"><Check className="size-4 text-success" aria-hidden="true" /> {t}</li>
              ))}
            </ul>
          </div>

          {/* Product preview built from real UI pieces */}
          <div aria-hidden="true" className="relative">
            <div className="absolute -inset-6 -z-10 overflow-hidden rounded-[2.5rem] bg-brand">
              <FruitScatter />
            </div>
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-pop">
              <div className="flex items-center gap-3 rounded-2xl bg-fruit-orange-soft p-3">
                <Fruit kind="orange" className="size-10" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">12-day streak!</p>
                  <div className="mt-1 h-2 rounded-full bg-card"><div className="h-full w-2/3 rounded-full bg-fruit-orange" /></div>
                </div>
                <span className="font-heading text-sm font-extrabold">Sapling</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fri, 9 Oct</p>
                  <p className="text-xl font-semibold">Good morning, Rahul</p>
                </div>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-role-admin-soft px-2.5 text-sm font-medium text-role-admin"><ShieldCheck className="size-4" /> Admin</span>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-danger-border bg-danger-soft/60 p-3.5">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" />
                <div>
                  <p className="text-[0.9375rem] font-semibold">Brufen + Ecosprin: serious</p>
                  <p className="text-sm text-muted-foreground">Papa · higher risk of stomach bleeding</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: "Suresh", r: "Father · 68", i: "SM", t: "bg-avatar-2", bp: "152/96", s: "High", tone: "border-danger-border bg-danger-soft text-danger", icon: TriangleAlert },
                  { n: "Aarav", r: "Son · 9", i: "AM", t: "bg-avatar-3", bp: "98.4°F", s: "Normal", tone: "border-success-border bg-success-soft text-success", icon: Check },
                ].map((m) => (
                  <div key={m.n} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold text-avatar-ink ${m.t}`}>{m.i}</span>
                      <div><p className="text-[0.9375rem] font-semibold">{m.n}</p><p className="text-xs text-muted-foreground">{m.r}</p></div>
                    </div>
                    <p className="mt-3 text-lg font-semibold tabular">{m.bp}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${m.tone}`}><m.icon className="size-3" /> {m.s}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 rounded-xl border border-border p-3.5">
                <p className="text-sm font-semibold">Morning medicines · 2 of 3 done</p>
                {["Glycomet 500 mg · Suresh", "Thyronorm 50 mcg · Priya", "Telma 40 mg · Suresh"].map((x, i) => (
                  <div key={x} className="flex items-center gap-2.5">
                    <span className={`flex size-7 items-center justify-center rounded-full border-2 ${i < 2 ? "border-success bg-success text-card" : "border-border-strong"}`}><Check className="size-4" strokeWidth={3} /></span>
                    <span className="text-sm">{x}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-xl border border-border bg-card p-3.5 shadow-pop sm:block">
              <p className="flex items-center gap-2 text-sm font-medium"><BellRing className="size-4 text-primary" /> Email to Priya: &ldquo;Papa hasn&apos;t taken Telma&rdquo;</p>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-border bg-surface/60 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-[2rem] leading-tight font-semibold">Everything the family needs, nothing it doesn&apos;t</h2>
              <p className="text-lg text-muted-foreground">One clear action per screen, large type, and plain words instead of medical jargon.</p>
            </div>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-accent-foreground"><f.icon className="size-5" aria-hidden="true" /></span>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="safety" className="py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div className="space-y-4 lg:sticky lg:top-24">
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">Responsible AI</p>
              <h2 className="text-[2rem] leading-tight font-semibold">AI that knows its limits</h2>
              <p className="text-lg text-muted-foreground">Safety rules always run first. AI can make advice more cautious, never less, and it never diagnoses or prescribes.</p>
              <ol className="space-y-3 pt-2">
                {[
                  ["Red-flag rules", "Chest pain with sweating, stroke signs, low oxygen: an emergency, decided without AI."],
                  ["AI suggests a level", "Self care, see a doctor, today, or emergency. Plain words, your language."],
                  ["The rules hold the floor", "If AI suggests something lower, the safer level wins. Diagnosis-like wording is removed."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                    <span><span className="block text-base font-semibold">{t}</span><span className="text-[0.9375rem] text-muted-foreground">{b}</span></span>
                  </li>
                ))}
              </ol>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2">
              {AI.map((f) => (
                <li key={f.title} className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-accent-foreground"><f.icon className="size-5" aria-hidden="true" /></span>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">{f.body}</p>
                </li>
              ))}
              <li className="flex flex-col justify-between gap-4 rounded-2xl bg-brand p-6 text-brand-foreground shadow-brand sm:col-span-2">
                <p className="flex items-center gap-2 text-sm font-medium opacity-90"><Languages className="size-4" aria-hidden="true" /> हिन्दी · मराठी · தமிழ் · বাংলা · తెలుగు · ಕನ್ನಡ · ગુજરાતી</p>
                <p className="text-xl leading-snug font-semibold text-inherit">&ldquo;सीने में दर्द और पसीना&rdquo; is recognised as an emergency, whether it&apos;s typed, spoken or written in English.</p>
              </li>
            </ul>
          </div>
        </section>

        <section id="privacy" className="border-t border-border bg-surface/60 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <h2 className="text-[2rem] leading-tight font-semibold">Private by default</h2>
                <p className="text-lg text-muted-foreground">Health data is family business. You decide who sees it, for how long, and you can see when it was opened.</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Check, t: "Consent first", b: "Clear consent at sign-up and every time you share." },
                  { icon: Lock, t: "Encrypted records", b: "AES-256-GCM before anything is stored." },
                  { icon: Link2, t: "Time-limited links", b: "Doctor links expire on their own and can be turned off." },
                  { icon: Eye, t: "Activity log", b: "See every role change, upload and link view." },
                ].map((p) => (
                  <li key={p.t} className="rounded-xl border border-border bg-card p-5">
                    <p.icon className="size-5 text-primary" aria-hidden="true" />
                    <p className="mt-3 text-base font-semibold">{p.t}</p>
                    <p className="text-[0.9375rem] text-muted-foreground">{p.b}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-[1.75rem] leading-tight font-semibold">See it with the Mehta family</h2>
                <p className="text-lg text-muted-foreground">Sign in as Rahul (admin), Priya (caregiver), Suresh (member) or Kamala (viewer) and watch permissions change.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {[{ i: ShieldCheck, l: "Admin" }, { i: HeartHandshake, l: "Caregiver" }, { i: UserRound, l: "Member" }, { i: Eye, l: "Viewer" }].map((r) => (
                    <span key={r.l} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-medium"><r.i className="size-4" aria-hidden="true" /> {r.l}</span>
                  ))}
                </div>
              </div>
              <Link href="/sign-in" className={buttonVariants({ size: "xl" })}>Open the demo <ArrowRight aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2"><Droplet className="size-4" aria-hidden="true" /> Pulse helps families organise health information. It is not a diagnosis. Consult a doctor. In an emergency call 112.</p>
          <p>Demo data is synthetic.</p>
        </div>
      </footer>
    </div>
  );
}
