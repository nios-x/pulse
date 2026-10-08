import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + input + error line. Strings arrive already translated. */
export function TextField({
  label,
  hint,
  error,
  className,
  id,
  name,
  ...inputProps
}: ComponentProps<"input"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
}) {
  const inputId = id ?? `field-${name}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* The label sits inside the box, like a card form: one tap target, one outline. */}
      <div
        className={cn(
          "rounded-lg border border-input bg-card px-3.5 pt-2 transition-[border-color,box-shadow] duration-200",
          "focus-within:border-violet focus-within:ring-4 focus-within:ring-violet/15",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/15"
        )}
      >
        <Label htmlFor={inputId} className="text-sm font-medium text-ink-3">
          {label}
        </Label>
        <Input
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-10 rounded-none border-0 bg-transparent px-0 text-[1.0625rem] font-medium focus-visible:ring-0 aria-invalid:ring-0"
          {...inputProps}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="px-1 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="px-1 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ children, tone = "error" }: { children?: string; tone?: "error" | "ok" }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-3.5 py-2.5 text-base font-medium",
        tone === "error" ? "bg-alert-wash text-alert-ink" : "bg-ok-wash text-ok-ink"
      )}
    >
      {children}
    </p>
  );
}
