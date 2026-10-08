import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown wherever a number gets a label like "High". The words come translated. */
export function SafetyNote({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-sm leading-snug text-ink-3", className)}>
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
