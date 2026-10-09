import { Eye, HeartHandshake, ShieldCheck, UserRound } from "lucide-react";
import type { Role } from "@/db/schema";
import { ROLE_LABEL } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const STYLE: Record<Role, string> = {
  admin: "bg-role-admin-soft text-role-admin",
  caregiver: "bg-role-caregiver-soft text-role-caregiver",
  member: "bg-role-member-soft text-role-member",
  viewer: "bg-role-viewer-soft text-role-viewer",
};

export const ROLE_ICON = { admin: ShieldCheck, caregiver: HeartHandshake, member: UserRound, viewer: Eye } as const;

export function RoleBadge({ role, className, size = "md" }: { role: Role; className?: string; size?: "sm" | "md" }) {
  const Icon = ROLE_ICON[role];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-sm",
        STYLE[role],
        className
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
      {ROLE_LABEL[role]}
    </span>
  );
}
