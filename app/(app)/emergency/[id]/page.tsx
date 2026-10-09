import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { EmergencyActions } from "@/components/emergency/emergency-actions";
import { EmergencyCard } from "@/components/emergency/emergency-card";
import { MemberAvatar } from "@/components/health/member-avatar";
import { buttonVariants } from "@/components/ui/button";
import { findVisibleMember, getContext } from "@/lib/context";
import { appUrl } from "@/lib/email-templates";
import { emergencyData, emergencySpeech, liveEmergencyLink } from "@/lib/emergency";
import { qrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Emergency card" };

export default async function EmergencyMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  const member = findVisibleMember(ctx, id);
  if (!member) notFound();
  const [data, link] = await Promise.all([emergencyData(member), liveEmergencyLink(member.id)]);
  const url = link ? appUrl(`/share/${link.token}`) : null;
  const qr = url ? { svg: await qrSvg(url), caption: "Scan to open this card" } : null;

  return (
    <div className="flex flex-col gap-6 animate-rise">
      <div className="no-print flex flex-col gap-4">
        <Link href={`/members/${member.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit -ml-2")}>
          <ArrowLeft aria-hidden="true" /> {member.name}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">Emergency card</h1>
            <p className="max-w-2xl text-base text-muted-foreground">Show it to paramedics or hospital staff. Print it for a wallet, or share the QR so it can be opened on any phone.</p>
          </div>
          <EmergencyActions memberId={member.id} shareUrl={url} speech={emergencySpeech(data)} name={member.name} />
        </div>
        {ctx.visibleMembers.length > 1 && (
          <nav aria-label="Choose person" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex min-w-max gap-2">
              {ctx.visibleMembers.map((m) => (
                <li key={m.id}>
                  <Link href={`/emergency/${m.id}`} aria-current={m.id === member.id ? "page" : undefined} className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-[0.9375rem] font-medium", m.id === member.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:bg-muted")}>
                    <MemberAvatar name={m.name} tone={m.avatarTone} size="sm" /> {m.name.split(" ")[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <EmergencyCard data={data} qr={qr} className="mx-auto w-full max-w-4xl" />
      <p className="no-print mx-auto flex max-w-4xl items-start gap-2 text-[0.9375rem] text-muted-foreground">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Tip: save the printed card as a photo and set it as the phone&apos;s lock screen, so it can be seen without unlocking.
      </p>
    </div>
  );
}
