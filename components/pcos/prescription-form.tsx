"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon, StethoscopeIcon, PillIcon, SparklesIcon, CalendarIcon } from "lucide-react";
import { savePrescriptionAction } from "@/app/actions/pcos";
import { Button } from "@/components/ui/button";

const COMMON_MEDS = [
  "Metformin",
  "Spironolactone",
  "Oral Contraceptive (Combined)",
  "Diane-35",
  "Letrozole",
  "Progesterone (Cyclic)",
];

const COMMON_SUPPS = [
  "Myo-inositol & D-chiro-inositol (40:1)",
  "Vitamin D3",
  "Omega-3 Fish Oil",
  "Magnesium Glycinate",
  "Spearmint Tea",
  "Zinc",
  "N-Acetyl Cysteine (NAC)",
  "Berberine",
];

export function PrescriptionForm({ patientId }: { patientId: string }) {
  const [meds, setMeds] = useState([
    { name: "Metformin", dose: "500 mg", frequency: "Once daily with dinner", notes: "With food" },
  ]);

  const [supps, setSupps] = useState([
    { name: "Myo-inositol & D-chiro-inositol (40:1)", dose: "2000 mg", frequency: "Twice daily" },
    { name: "Vitamin D3", dose: "2000 IU", frequency: "Once daily" },
  ]);

  const addMed = () => {
    setMeds([...meds, { name: "", dose: "", frequency: "Once daily", notes: "" }]);
  };

  const removeMed = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const updateMed = (index: number, field: string, value: string) => {
    const updated = [...meds];
    (updated[index] as any)[field] = value;
    setMeds(updated);
  };

  const addSupp = () => {
    setSupps([...supps, { name: "", dose: "", frequency: "Once daily" }]);
  };

  const removeSupp = (index: number) => {
    setSupps(supps.filter((_, i) => i !== index));
  };

  const updateSupp = (index: number, field: string, value: string) => {
    const updated = [...supps];
    (updated[index] as any)[field] = value;
    setSupps(updated);
  };

  return (
    <form action={savePrescriptionAction} className="flex flex-col gap-6">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="medicationsJson" value={JSON.stringify(meds.filter((m) => m.name.trim()))} />
      <input type="hidden" name="supplementsJson" value={JSON.stringify(supps.filter((s) => s.name.trim()))} />

      {/* Doctor & Clinic Details */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
          <StethoscopeIcon className="size-5 text-teal-600" />
          <h2 className="text-base font-semibold text-foreground">Doctor & Diagnosis</h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            Doctor's Name <span className="text-destructive">*</span>
          </label>
          <input
            name="doctorName"
            required
            defaultValue="Dr. Priya Sharma, MD (OB/GYN)"
            placeholder="e.g. Dr. Priya Sharma"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Clinic / Hospital Name</label>
            <input
              name="clinicName"
              defaultValue="Apollo Women's Clinic"
              placeholder="e.g. Fortis Hospital"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Prescription Date <span className="text-destructive">*</span>
            </label>
            <input
              name="prescriptionDate"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Phenotype / Clinical Driver</label>
          <select
            name="phenotype"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">Doctor did not specify (We'll classify in next step)</option>
            <option value="insulin_resistant">Insulin-Resistant PCOS (Metabolic driver)</option>
            <option value="adrenal_stress">Adrenal / Stress-Induced PCOS (Elevated DHEA-S)</option>
            <option value="inflammatory">Inflammatory PCOS</option>
            <option value="post_pill">Post-Pill PCOS (Rebound)</option>
          </select>
        </div>
      </div>

      {/* Prescribed Medications */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <PillIcon className="size-5 text-teal-600" />
            <h2 className="text-base font-semibold text-foreground">Prescribed Medications</h2>
          </div>
          <button
            type="button"
            onClick={addMed}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <PlusIcon className="size-3.5" /> Add Medication
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Enter medicines from your doctor's Rx. These will automatically appear in your daily
          reminders.
        </p>

        <div className="flex flex-col gap-3">
          {meds.map((med, index) => (
            <div
              key={index}
              className="rounded-xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 p-3.5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  list="common-meds-list"
                  value={med.name}
                  onChange={(e) => updateMed(index, "name", e.target.value)}
                  placeholder="Medicine Name (e.g. Metformin)"
                  className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-medium focus:border-teal-500 focus:outline-none"
                />
                {meds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMed(index)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={med.dose}
                  onChange={(e) => updateMed(index, "dose", e.target.value)}
                  placeholder="Dose (e.g. 500 mg)"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-teal-500 focus:outline-none"
                />
                <select
                  value={med.frequency}
                  onChange={(e) => updateMed(index, "frequency", e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily</option>
                  <option value="Three times daily">Three times daily</option>
                  <option value="As needed">As needed</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <datalist id="common-meds-list">
          {COMMON_MEDS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      {/* Prescribed / Recommended Supplements */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <SparklesIcon className="size-5 text-teal-600" />
            <h2 className="text-base font-semibold text-foreground">Doctor-Recommended Supplements</h2>
          </div>
          <button
            type="button"
            onClick={addSupp}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <PlusIcon className="size-3.5" /> Add Supplement
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {supps.map((supp, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/60 bg-muted/30 p-3.5 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  list="common-supps-list"
                  value={supp.name}
                  onChange={(e) => updateSupp(index, "name", e.target.value)}
                  placeholder="Supplement Name"
                  className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-medium focus:border-teal-500 focus:outline-none"
                />
                {supps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSupp(index)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={supp.dose}
                  onChange={(e) => updateSupp(index, "dose", e.target.value)}
                  placeholder="Dose (e.g. 2000 mg)"
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
                />
                <select
                  value={supp.frequency}
                  onChange={(e) => updateSupp(index, "frequency", e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-teal-500 focus:outline-none"
                >
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily</option>
                  <option value="As needed">As needed</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <datalist id="common-supps-list">
          {COMMON_SUPPS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {/* Clinical Notes & Lifestyle Prescriptions */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground pb-2 border-b border-border/50">
          Doctor's Lifestyle & Clinical Advice
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Dietary Guidance</label>
          <textarea
            name="dietaryAdvice"
            rows={2}
            defaultValue="High protein breakfast, avoid refined sugars, pair carbohydrates with fiber and protein."
            placeholder="e.g. Focus on low glycemic foods, protein first at meals"
            className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Exercise Guidance</label>
          <textarea
            name="exerciseAdvice"
            rows={2}
            defaultValue="Strength training 3x/week and daily 15-minute brisk walk after meals. Keep cortisol low."
            placeholder="e.g. 150 mins moderate activity weekly, gentle strength training"
            className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Next Doctor Follow-up</label>
          <input
            name="followUpDate"
            type="date"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="pb-8">
        <Button
          type="submit"
          size="xl"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-base shadow-sm"
        >
          Save Prescription & Proceed to Assessment →
        </Button>
      </div>
    </form>
  );
}
