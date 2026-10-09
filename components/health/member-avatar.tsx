import { cn } from "@/lib/utils";

const TONES = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
] as const;

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function MemberAvatar({
  name,
  tone = 1,
  size = "md",
  className,
}: {
  name: string;
  tone?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide text-avatar-ink select-none",
        TONES[(Math.max(1, tone) - 1) % TONES.length],
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
