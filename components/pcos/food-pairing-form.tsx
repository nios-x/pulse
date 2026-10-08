"use client";

import { useState } from "react";
import { CheckIcon, SparklesIcon, UtensilsIcon } from "lucide-react";
import { savePcosFoodLogAction } from "@/app/actions/pcos";
import { Button } from "@/components/ui/button";
import { pcosFoods } from "@/lib/pcos-foods";

export function FoodPairingForm({ patientId }: { patientId: string }) {
  const [slot, setSlot] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [selectedItems, setSelectedItems] = useState<string[]>(["dal", "roti"]);
  const [preMealAction, setPreMealAction] = useState("protein_first");
  const [postMealAction, setPostMealAction] = useState("walked_10min");

  const toggleItem = (key: string) => {
    if (selectedItems.includes(key)) {
      setSelectedItems(selectedItems.filter((k) => k !== key));
    } else {
      setSelectedItems([...selectedItems, key]);
    }
  };

  const foodList = Object.values(pcosFoods);

  return (
    <form action={savePcosFoodLogAction} className="flex flex-col gap-5">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="preMealAction" value={preMealAction} />
      <input type="hidden" name="postMealAction" value={postMealAction} />
      {selectedItems.map((item) => (
        <input key={item} type="hidden" name="items" value={item} />
      ))}

      {/* Meal slot selector */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted/60">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
              slot === s ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Food items multi-select chips */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>What foods did you eat?</span>
          <span className="text-[0.65rem] text-muted-foreground font-normal">
            {selectedItems.length} selected
          </span>
        </label>

        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border rounded-xl border-border/70 bg-card">
          {foodList.map((food) => {
            const isSelected = selectedItems.includes(food.key);
            return (
              <button
                key={food.key}
                type="button"
                onClick={() => toggleItem(food.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-teal-600 text-white font-semibold shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {food.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pre-meal Strategy: The addition-first hack */}
      <div className="rounded-2xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="size-4 text-teal-600" />
          <h3 className="text-xs font-bold text-teal-950 dark:text-teal-100 uppercase tracking-wide">
            Pre-Meal Sequencing Hack
          </h3>
        </div>

        <p className="text-[0.68rem] text-muted-foreground leading-relaxed">
          Eating protein or fiber before carbs blunts your post-meal glucose spike by up to 40%.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "protein_first", label: "🥗 Ate Protein / Fiber First" },
            { id: "acv_water", label: "🍋 Lemon / ACV in Water" },
            { id: "chia_fat", label: "🥑 Healthy Fat Anchor Added" },
            { id: "standard", label: "🍚 Standard Order" },
          ].map((strat) => (
            <button
              key={strat.id}
              type="button"
              onClick={() => setPreMealAction(strat.id)}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                preMealAction === strat.id
                  ? "border-teal-600 bg-teal-600 text-white font-semibold"
                  : "border-border/60 bg-background text-foreground hover:border-teal-500/40"
              }`}
            >
              {strat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Post-meal glucose stabilization */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 flex flex-col gap-2.5">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
          Post-Meal Glucose Action
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "walked_10min", label: "🚶‍♀️ 10-Min Walk (Recommended)" },
            { id: "light_stretching", label: "🧘‍♀️ Light Stretching" },
            { id: "standing_chores", label: "🧺 Stood / Active" },
            { id: "seated", label: "🛋️ Seated / Rested" },
          ].map((strat) => (
            <button
              key={strat.id}
              type="button"
              onClick={() => setPostMealAction(strat.id)}
              className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                postMealAction === strat.id
                  ? "border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-semibold"
                  : "border-border/60 bg-background text-foreground hover:border-teal-500/40"
              }`}
            >
              {strat.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={selectedItems.length === 0}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-base h-12 shadow-sm"
      >
        <UtensilsIcon className="size-4 mr-2" /> Log Food Pairing
      </Button>
    </form>
  );
}
