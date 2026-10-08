"use client";

import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, SparklesIcon, HeartPulseIcon } from "lucide-react";
import { savePcosProfileAction } from "@/app/actions/pcos";
import { Button } from "@/components/ui/button";

interface QuizProps {
  patientId: string;
  doctorName?: string;
}

export function OnboardingQuiz({ patientId, doctorName }: QuizProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 9;

  // Answers state
  const [diagnosedWhen, setDiagnosedWhen] = useState("recent");
  const [wasBirthControl, setWasBirthControl] = useState(false);
  const [weightDistribution, setWeightDistribution] = useState("midsection");
  const [concerns, setConcerns] = useState<string[]>(["acne_jawline"]);
  const [stressLevel, setStressLevel] = useState("constant");
  const [sleepPattern, setSleepPattern] = useState("midnight_2am");
  const [eatingPattern, setEatingPattern] = useState("skip_breakfast");
  const [triedBefore, setTriedBefore] = useState<string[]>(["fitness_apps"]);
  const [topPriority, setTopPriority] = useState("periods");

  const toggleArrayItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const answersJson = JSON.stringify({
    diagnosedWhen,
    wasBirthControl,
    weightDistribution,
    skinHairConcerns: concerns,
    stressLevel,
    sleepPattern,
    eatingPattern,
    triedBefore,
    topPriority,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Progress header */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {step} of {totalSteps}
        </span>
      </div>

      {/* Step 1: Diagnosis History */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">When were you diagnosed?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This helps us calibrate how long your body has been experiencing hormonal shifts.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: "recent", title: "Recently (within last 6 months)", desc: "Still learning the basics" },
              { id: "1_3_years", title: "1 to 3 years ago", desc: "Have tried a few treatments" },
              { id: "3_plus_years", title: "More than 3 years ago", desc: "Long-term management" },
              { id: "suspected", title: "Suspected / Recently recommended testing", desc: "Awaiting formal ultrasound/labs" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDiagnosedWhen(opt.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
                  diagnosedWhen === opt.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-500/40"
                }`}
              >
                <span className="font-semibold text-foreground text-base">{opt.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Birth Control */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Did symptoms emerge after stopping birth control?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Post-pill androgen surges are common as your pituitary gland recalibrates communication
              with your ovaries.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWasBirthControl(true)}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                wasBirthControl === true
                  ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                  : "border-border/60 bg-card hover:border-teal-500/40"
              }`}
            >
              <span className="text-2xl mb-1">💊</span>
              <span className="font-semibold text-base text-foreground">Yes</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Symptoms started after stopping the pill
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWasBirthControl(false)}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                wasBirthControl === false
                  ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                  : "border-border/60 bg-card hover:border-teal-500/40"
              }`}
            >
              <span className="text-2xl mb-1">🌿</span>
              <span className="font-semibold text-base text-foreground">No</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Symptoms appeared naturally or unrelated
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Weight Distribution */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Where does your body carry weight?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Visceral fat in the midsection is strongly linked to insulin resistance, whereas lean
              PCOS often stems from adrenal cortisol.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: "midsection", title: "Midsection & Abdomen", desc: "Tend to gain easily around the belly" },
              { id: "even", title: "Evenly Distributed", desc: "Hips, thighs, and upper body equally" },
              { id: "lean", title: "I have Lean PCOS", desc: "Normal or low BMI, but irregular periods & high androgens" },
              { id: "prefer_not", title: "Prefer not to say", desc: "Skip this detail" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWeightDistribution(opt.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
                  weightDistribution === opt.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-500/40"
                }`}
              >
                <span className="font-semibold text-foreground text-base">{opt.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Skin & Hair Concerns */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Your skin & hair experiences?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select all that apply. Androgen excess manifests differently in each body.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { id: "acne_jawline", label: "Jawline / Chin Hormonal Acne" },
              { id: "hirsutism_face", label: "Excess Facial Hair (Chin, upper lip)" },
              { id: "hair_thinning", label: "Scalp Hair Thinning or Shedding" },
              { id: "acanthosis", label: "Dark Velvety Patches on Neck / Creases" },
              { id: "bloating", label: "Frequent Severe Bloating & Digestion Issues" },
            ].map((item) => {
              const active = concerns.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleArrayItem(concerns, setConcerns, item.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    active
                      ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                      : "border-border/60 bg-card hover:border-teal-500/30"
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  <div
                    className={`size-6 rounded-lg flex items-center justify-center border ${
                      active ? "bg-teal-600 border-teal-600 text-white" : "border-muted-foreground/30"
                    }`}
                  >
                    {active && <CheckIcon className="size-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 5: Stress Level */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">How is your chronic stress level?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cortisol directly upregulates DHEA-S production in the adrenal glands, driving acne and
              irregular cycles.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: "managing", title: "Manageable", desc: "Occasional stress, but I recover easily" },
              { id: "constant", title: "Constant & Heavy", desc: "College/job pressure, feeling chronically on edge" },
              { id: "panic_anxiety", title: "High Anxiety & Somatic Spikes", desc: "Racing heart, physical tension, panic spells" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStressLevel(opt.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
                  stressLevel === opt.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-500/40"
                }`}
              >
                <span className="font-semibold text-foreground text-base">{opt.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Sleep */}
      {step === 6 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">What is your typical sleep rhythm?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sleeping past 1 AM suppresses melatonin and reduces skeletal muscle insulin sensitivity
              by 20-30%.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: "before_midnight", title: "Before 12:00 AM", desc: "Consistent bedtime and restful sleep" },
              { id: "midnight_2am", title: "Between 12:00 AM and 2:00 AM", desc: "Common for students & early career" },
              { id: "after_2am", title: "After 2:00 AM", desc: "Night owl, late screen time" },
              { id: "chaotic", title: "Irregular & Fragmented", desc: "Shift work, insomnia, frequent waking" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSleepPattern(opt.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
                  sleepPattern === opt.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-500/40"
                }`}
              >
                <span className="font-semibold text-foreground text-base">{opt.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 7: Eating Patterns */}
      {step === 7 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">How do you usually eat?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Skipping breakfast causes exaggerated glucose surges at lunch and evening cravings.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: "regular_3meals", title: "3 Regular Meals", desc: "Consistent timing most days" },
              { id: "skip_breakfast", title: "Habitually Skip Breakfast", desc: "Only chai/coffee until afternoon, then ravenous" },
              { id: "eat_when_remember", title: "Eat When I Remember", desc: "Busy schedule leads to erratic meal times" },
              { id: "restrict_binge", title: "Restrict During Day, Crave at Night", desc: "Try to eat very little, then binge late" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEatingPattern(opt.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
                  eatingPattern === opt.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-500/40"
                }`}
              >
                <span className="font-semibold text-foreground text-base">{opt.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 8: Previous Apps & Drops */}
      {step === 8 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">What have you tried before?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Helps us avoid what burned you out previously.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { id: "fitness_apps", label: "Calorie counting apps (MyFitnessPal, etc.)" },
              { id: "strict_diets", label: "Strict elimination diets (cut gluten, dairy)" },
              { id: "hiit_workouts", label: "Intense daily HIIT or grueling gym routines" },
              { id: "metformin", label: "Metformin from doctor (stopped due to stomach upset)" },
              { id: "birth_control", label: "Birth control pills (stopped due to mood changes)" },
              { id: "none", label: "Nothing formal yet" },
            ].map((item) => {
              const active = triedBefore.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleArrayItem(triedBefore, setTriedBefore, item.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    active
                      ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                      : "border-border/60 bg-card hover:border-teal-500/30"
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  <div
                    className={`size-6 rounded-lg flex items-center justify-center border ${
                      active ? "bg-teal-600 border-teal-600 text-white" : "border-muted-foreground/30"
                    }`}
                  >
                    {active && <CheckIcon className="size-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 9: Top Priority */}
      {step === 9 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Your top priority right now?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We focus our daily micro-commitments on what matters most to you today.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { id: "periods", title: "Regulating My Menstrual Cycle", desc: "Ovulation and predictable periods" },
              { id: "skin", title: "Clearing Hormonal Acne & Skin", desc: "Targeting jawline breakouts and oiliness" },
              { id: "energy", title: "Overcoming Fatigue & Brain Fog", desc: "Sustained daytime stamina without crashes" },
              { id: "weight", title: "Metabolic & Weight Balance", desc: "Improving insulin sensitivity safely" },
              { id: "all", title: "Holistic Long-Term Balance", desc: "A sustainable lifestyle that feels good" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTopPriority(opt.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all ${
                  topPriority === opt.id
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/30"
                    : "border-border/60 bg-card hover:border-teal-500/40"
                }`}
              >
                <span className="font-semibold text-foreground text-base">{opt.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-4 pb-8">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="flex-1 rounded-xl h-12"
          >
            <ArrowLeftIcon className="size-4 mr-2" /> Back
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            type="button"
            size="lg"
            onClick={handleNext}
            className="flex-1 rounded-xl h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          >
            Continue <ArrowRightIcon className="size-4 ml-2" />
          </Button>
        ) : (
          <form action={savePcosProfileAction} className="flex-1">
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="answersJson" value={answersJson} />
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
            >
              <SparklesIcon className="size-4 mr-2" /> Generate Personalized Plan
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
