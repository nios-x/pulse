import {
  CalendarDays,
  FileHeart,
  Flower2,
  House,
  type LucideIcon,
  Pill,
  Settings,
  Siren,
  Sprout,
  Stethoscope,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean; mobileLabel?: string };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House, mobile: true },
  { href: "/medications", label: "Medicines", icon: Pill, mobile: true },
  { href: "/progress", label: "Progress & rewards", icon: Sprout, mobile: true, mobileLabel: "Rewards" },
  { href: "/appointments", label: "Appointments", icon: CalendarDays, mobile: true, mobileLabel: "Visits" },
  { href: "/records", label: "Records", icon: FileHeart },
  { href: "/pcos", label: "PCOS care", icon: Flower2 },
  { href: "/triage", label: "Symptom check", icon: Stethoscope },
  { href: "/emergency", label: "Emergency card", icon: Siren },
  { href: "/settings", label: "Family settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
