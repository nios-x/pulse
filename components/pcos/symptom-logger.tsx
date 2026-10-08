"use client";

import { useState } from "react";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { saveSymptomLogAction } from "@/app/actions/pcos";
import { Button } from "@/components/ui/button";
import type { SymptomCategory } from "@/db/schema";

const SYMPTOMS: { id: SymptomCategory; label: string; desc: string; icon: string }[] = [
  { id: "acne_jawline", label: "Jawline / Chin Acne", desc: "Hormonal breakout intensity", icon: "✨" },
  { id: "bloating", label: "Bloating / Digestion", desc: "Abdominal heaviness after eating", icon: "💨" },
  { id: "fatigue", label: "Daytime Fatigue", desc: "Energy crash or afternoon slump", icon: "🔋" },
  { id: "craving_sugar", label: "Sugar / Carb Cravings", desc: "Urge for sweets or late snacking", icon: "🍩" },
  { id: "hirsutism_face", label: "Facial Hair / Hirsutism", desc: "Chin/lip coarse hair growth", icon: "🪒" },
  { id: "low_mood", label: "Mood / Anxiety", desc: "Irritability or feeling low", icon: "🌧️" },
  { id: "insomnia", label: "Sleep Issues", desc: "Difficulty falling asleep or waking up", icon: "🌙" },
];

export function SymptomLogger({ patientId }: { patientId: string }) {
  const [activeCategory, setActiveCategory] = useState<SymptomCategory>("acne_jawline");
  const [severity, setSeverity] = useState(3);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await saveSymptomLogAction(patientId, activeCategory, severity, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Symptom to Check-In
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SYMPTOMS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveCategory(s.id)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                activeCategory === s.id
                  ? "border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 font-semibold"
                  : "border-border/60 bg-card hover:border-teal-500/30"
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span className="text-xs leading-tight truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity Selector (1 to 5) */}
      <div className="rounded-2xl border border-border/70 bg-card p-4.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Severity Level</span>
          <span className="text-xs font-bold text-teal-600">
            {severity === 1 && "Mild / Barely Noticeable"}
            {severity === 2 && "Light"}
            {severity === 3 && "Moderate"}
            {severity === 4 && "Strong / Bothering"}
            {severity === 5 && "Severe Flare-up"}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSeverity(lvl)}
              className={`h-11 rounded-xl font-bold text-sm transition-all ${
                severity === lvl
                  ? "bg-teal-600 text-white shadow-xs scale-102"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-[0.65rem] text-muted-foreground px-1">
          <span>1 = Minimal</span>
          <span>5 = Intense</span>
        </div>

        <div className="pt-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context (e.g. after late night study)"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
          />
        </div>

        <Button
          type="button"
          disabled={isSubmitting}
          onClick={handleSave}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl mt-1 text-sm h-11"
        >
          {saved ? (
            <span className="flex items-center gap-1.5 text-white">
              <CheckIcon className="size-4" /> Logged Successfully
            </span>
          ) : (
            "Save Symptom Reading"
          )}
        </Button>
      </div>
    </div>
  );
}
