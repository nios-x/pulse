import {
  CalendarDays,
  FileHeart,
  House,
  type LucideIcon,
  Pill,
  Settings,
  Siren,
  Stethoscope,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House, mobile: true },
  { href: "/medications", label: "Medicines", icon: Pill, mobile: true },
  { href: "/appointments", label: "Appointments", icon: CalendarDays, mobile: true },
  { href: "/records", label: "Records", icon: FileHeart, mobile: true },
  { href: "/triage", label: "Symptom check", icon: Stethoscope },
  { href: "/emergency", label: "Emergency card", icon: Siren },
  { href: "/settings", label: "Family settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
