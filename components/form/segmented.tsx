"use client";

import { cn } from "@/lib/utils";

/** A row of large radio buttons. Native radios underneath, so keyboard and screen readers just work. */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }[];
  label: string;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const Icon = o.icon;
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 text-base font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              size === "lg" ? "min-h-12" : "min-h-11",
              checked ? "border-primary bg-accent text-accent-foreground" : "border-border-strong bg-card text-foreground hover:bg-muted"
            )}
          >
            <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
            {Icon && <Icon className="size-[1.125rem]" aria-hidden="true" />}
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
