import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
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
  variant = "pill",
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
  /** "tile": a small card with the icon on top, like a grocery category. */
  variant?: "pill" | "tile";
}) {
  const tile = variant === "tile";
  // Free-flowing pills show a check when picked; grid rows have no room for it.
  const pillCheck = !tile && !columns;
  const selected = new Set(
    defaultValue === undefined ? [] : typeof defaultValue === "string" ? [defaultValue] : defaultValue
  );
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      {legend ? <legend className="mb-2 font-heading text-base font-semibold text-plum">{legend}</legend> : null}
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
                "flex min-h-11 cursor-pointer items-center gap-2 border border-edge-strong bg-card px-4 py-2 text-base font-medium text-plum transition-[background-color,border-color,color,box-shadow] duration-200 select-none hover:border-violet/50",
                tile
                  ? "relative min-h-20 flex-col justify-center gap-1 rounded-xl border-transparent px-1 text-center text-sm leading-tight shadow-card peer-checked:border-violet peer-checked:bg-violet-wash peer-checked:text-violet-deep"
                  : "rounded-full peer-checked:border-lilac peer-checked:bg-lilac peer-checked:text-violet-deep",
                "[&>.chk]:hidden peer-checked:[&>.chk]:flex",
                "peer-focus-visible:ring-4 peer-focus-visible:ring-violet/20 peer-disabled:opacity-40",
                option.description && "flex-col items-start gap-0.5 rounded-xl py-3",
                chipClassName
              )}
            >
              {tile ? (
                <span className="chk absolute top-1.5 right-1.5 size-5 items-center justify-center rounded-full bg-violet text-white">
                  <CheckIcon className="size-3.5 stroke-3" aria-hidden />
                </span>
              ) : pillCheck && !option.description ? (
                <CheckIcon className="chk size-4 shrink-0 stroke-3" aria-hidden />
              ) : null}
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
