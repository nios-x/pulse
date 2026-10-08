import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChoiceOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

/**
 * Big tappable chips backed by native radio or checkbox inputs,
 * so they submit with the form and work before JavaScript loads.
 */
export function ChoiceChips({
  name,
  type = "radio",
  options,
  defaultValue,
  legend,
  className,
  chipClassName,
  columns,
  required,
}: {
  name: string;
  type?: "radio" | "checkbox";
  options: ChoiceOption[];
  defaultValue?: string | readonly string[];
  legend?: ReactNode;
  className?: string;
  chipClassName?: string;
  columns?: 2 | 3 | 4;
  required?: boolean;
}) {
  const selected = new Set(
    defaultValue === undefined ? [] : typeof defaultValue === "string" ? [defaultValue] : defaultValue
  );
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      {legend ? <legend className="mb-2 text-base font-medium">{legend}</legend> : null}
      <div
        className={cn(
          "gap-2",
          columns
            ? { 2: "grid grid-cols-2", 3: "grid grid-cols-3", 4: "grid grid-cols-4" }[columns]
            : "flex flex-wrap"
        )}
      >
        {options.map((option) => (
          <label key={option.value} className="relative block">
            <input
              type={type}
              name={name}
              value={option.value}
              defaultChecked={selected.has(option.value)}
              disabled={option.disabled}
              required={required && type === "radio"}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 py-2 text-base font-medium transition-colors select-none",
                "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-disabled:opacity-40",
                option.description && "flex-col items-start gap-0.5 py-3",
                chipClassName
              )}
            >
              {option.icon}
              <span>{option.label}</span>
              {option.description ? (
                <span className="text-sm font-normal opacity-80">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
