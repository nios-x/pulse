import { cn } from "@/lib/utils";

const INKS = ["bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4", "bg-avatar-5"] as const;

/** Initials on a muted ink that never reads as a health status. */
export function MemberAvatar({
  name,
  index,
  size = "md",
  className,
}: {
  name: string;
  index: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight text-white uppercase",
        "shadow-[inset_0_1px_0_oklch(1_0_0/0.3),0_6px_14px_-8px_oklch(0.3_0.04_200/0.6)]",
        INKS[index % INKS.length],
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-14 text-lg",
        size === "xl" && "size-20 text-2xl",
        className
      )}
    >
      {initials}
    </span>
  );
}
