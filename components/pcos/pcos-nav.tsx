"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDaysIcon, HeartPulseIcon, UtensilsIcon, ActivityIcon, Share2Icon } from "lucide-react";

export function PcosNav({ patientId }: { patientId: string }) {
  const pathname = usePathname();

  const links = [
    { href: `/pcos/today?p=${patientId}`, label: "Today", icon: CalendarDaysIcon, active: pathname.includes("/today") },
    { href: `/pcos/symptoms?p=${patientId}`, label: "Symptoms", icon: ActivityIcon, active: pathname.includes("/symptoms") },
    { href: `/pcos/food?p=${patientId}`, label: "Food Pairing", icon: UtensilsIcon, active: pathname.includes("/food") },
    { href: `/pcos/cycle?p=${patientId}`, label: "Cycle", icon: HeartPulseIcon, active: pathname.includes("/cycle") },
    { href: `/pcos/share?p=${patientId}`, label: "Doctor Rx", icon: Share2Icon, active: pathname.includes("/share") },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-print border-b border-border/40 mb-4">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              link.active
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
