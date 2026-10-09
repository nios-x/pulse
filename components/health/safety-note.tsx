import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown wherever a health value is interpreted. */
export function SafetyNote({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-2 text-sm text-muted-foreground", className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children ?? "Not a diagnosis. Consult a doctor."}</span>
    </p>
  );
}
