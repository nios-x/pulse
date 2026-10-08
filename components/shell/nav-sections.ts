// Shared by the server shell and the client rail, so it must not be a "use client" module:
// plain values exported from a client module reach Server Components as references, not data.

import {
  CalendarDaysIcon,
  FileHeartIcon,
  HeartPulseIcon,
  LayoutListIcon,
  PillIcon,
  SirenIcon,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n";
import type { AppRole } from "@/lib/roles";

export type NavMember = { id: string; name: string; appRole: AppRole; index: number };

export const PROFILE_SECTIONS: { key: MessageKey; segment: string; icon: LucideIcon }[] = [
  { key: "nav.overview", segment: "", icon: LayoutListIcon },
  { key: "nav.vitals", segment: "vitals", icon: HeartPulseIcon },
  { key: "nav.meds", segment: "meds", icon: PillIcon },
  { key: "nav.appointments", segment: "doctor", icon: CalendarDaysIcon },
  { key: "nav.records", segment: "records", icon: FileHeartIcon },
  { key: "nav.emergency", segment: "emergency", icon: SirenIcon },
];

export function sectionHref(patientId: string, segment: string) {
  return segment ? `/p/${patientId}/${segment}` : `/p/${patientId}`;
}
