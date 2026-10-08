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
      <Label htmlFor={inputId} className="text-base">
        {label}
      </Label>
      <Input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
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
        "rounded-lg px-3 py-2 text-base",
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-success/15 text-foreground"
      )}
    >
      {children}
    </p>
  );
}
