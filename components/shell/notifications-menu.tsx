"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell, CalendarClock, HeartPulse, Pill, PillBottle, ShieldAlert, Stethoscope, Sunrise } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  unread: boolean;
  ago: string;
};

const ICON: Record<string, typeof Bell> = {
  missed_dose: Pill,
  abnormal_vital: HeartPulse,
  refill: PillBottle,
  appointment: CalendarClock,
  interaction: ShieldAlert,
  digest: Sunrise,
  triage: Stethoscope,
};

const SEVERITY_WORD = { info: "Info", warning: "Needs attention", urgent: "Urgent" } as const;

export function NotificationsMenu({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [, start] = useTransition();
  return (
    <Popover
      onOpenChange={(open) => {
        if (!open && unread > 0) start(() => markNotificationsRead());
      }}
    >
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} />}
      >
        <Bell aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-base font-semibold">Notifications</p>
          <span className="text-sm text-muted-foreground">Also sent by email</span>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-base text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <ul className="max-h-[60dvh] divide-y divide-border overflow-y-auto">
            {items.map((n) => {
              const Icon = ICON[n.kind] ?? Bell;
              const content = (
                <div className={cn("flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted", n.unread && "bg-accent/40")}>
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                      n.severity === "urgent" ? "bg-danger-soft text-danger" : n.severity === "warning" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[0.9375rem] leading-snug font-medium">{n.title}</p>
                    <p className="text-sm leading-snug text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="sr-only">{SEVERITY_WORD[n.severity]}. </span>
                      {n.ago}
                      {n.unread && <span className="ml-2 font-medium text-primary">New</span>}
                    </p>
                  </div>
                </div>
              );
              return <li key={n.id}>{n.href ? <Link href={n.href} className="block focus-visible:outline-offset-[-2px]">{content}</Link> : content}</li>;
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
