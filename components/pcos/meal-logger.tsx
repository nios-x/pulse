"use client";

import { useState, useTransition } from "react";
import { Check, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { logMeal } from "@/app/actions/pcos";
import { Segmented } from "@/components/form/segmented";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { mealFeedback, PCOS_FOODS } from "@/lib/pcos";
import { cn } from "@/lib/utils";

const TAG_STYLE: Record<string, string> = { protein: "text-success", high_carb: "text-warning", fiber: "text-info" };

export function MealLogger({ memberId }: { memberId: string }) {
  const { can } = useAccess();
  const [meal, setMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [items, setItems] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const fb = mealFeedback(items);
  const save = () =>
    start(async () => {
      const res = await logMeal({ memberId, meal, items });
      if (res.ok) {
        toast.success(res.message, { description: res.data?.tip });
        setItems([]);
      } else toast.error(res.error);
    });
  return (
    <div className="flex flex-col gap-4">
      <Segmented name="meal" label="Which meal" value={meal} onChange={setMeal} options={[{ value: "breakfast", label: "Breakfast" }, { value: "lunch", label: "Lunch" }, { value: "dinner", label: "Dinner" }, { value: "snack", label: "Snack" }]} />
      <ul className="flex flex-wrap gap-2" aria-label="Foods">
        {PCOS_FOODS.map((f) => {
          const on = items.includes(f.key);
          const main = f.tags.includes("protein") ? "protein" : f.tags.includes("high_carb") ? "high_carb" : f.tags.includes("fiber") ? "fiber" : null;
          return (
            <li key={f.key}>
              <button type="button" aria-pressed={on} onClick={() => setItems(on ? items.filter((x) => x !== f.key) : [...items, f.key])} className={cn("inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[0.9375rem] transition-colors", on ? "border-brand bg-brand-soft font-semibold text-accent-foreground" : "border-border-strong bg-card hover:bg-muted")}>
                {on && <Check className="size-4" aria-hidden="true" />}
                {f.label}
                {main && <span className={cn("text-xs font-medium", TAG_STYLE[main])}>{main === "protein" ? "protein" : main === "high_carb" ? "carb" : "fibre"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > 0 && (
        <p className={cn("flex gap-2 rounded-2xl px-4 py-3 text-[0.9375rem]", fb.balanced ? "bg-success-soft" : "bg-warning-soft")} aria-live="polite">
          <Lightbulb className={cn("mt-0.5 size-5 shrink-0", fb.balanced ? "text-success" : "text-warning")} aria-hidden="true" />
          {fb.tip}
        </p>
      )}
      <Button className="w-fit" disabled={!items.length || pending || !can("vitals.log", memberId)} onClick={save}>{pending ? "Saving…" : "Log this meal"}</Button>
    </div>
  );
}
