"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  cycleLogs,
  graceDays,
  medications,
  memberships,
  patients,
  pcosDailyActions,
  pcosFoodLogs,
  pcosPrescriptions,
  pcosProfiles,
  symptomLogs,
  type GraceDayReason,
  type MealSlot,
  type MovementType,
  type SymptomCategory,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { istDate } from "@/lib/dates";
import { now } from "@/lib/now";
import { classifyPhenotype, type OnboardingAnswers } from "@/lib/pcos-phenotype";
import { defaultScopes } from "@/lib/permissions";

/**
 * 1. Create a PCOS Profile for oneself
 */
export async function createPcosPatientAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || user.name || "My PCOS Profile").trim();
  const birthYearRaw = formData.get("birthYear");
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;
  const city = String(formData.get("city") || "").trim() || null;

  const patientId = await db.transaction(async (tx) => {
    const [patient] = await tx
      .insert(patients)
      .values({
        name,
        birthYear,
        city,
        condition: "pcos",
        createdBy: user.id,
      })
      .returning({ id: patients.id });

    await tx.insert(memberships).values({
      patientId: patient.id,
      userId: user.id,
      role: "owner",
      scopes: defaultScopes("owner"),
    });

    await audit(
      { actorUserId: user.id, patientId: patient.id, action: "pcos_patient_created", detail: {} },
      tx
    );

    return patient.id;
  });

  redirect(`/pcos/prescription?p=${patientId}`);
}

/**
 * 2. Save Doctor's Prescription (MANDATORY FIRST STEP)
 */
export async function savePrescriptionAction(formData: FormData) {
  const user = await requireUser();
  const patientId = String(formData.get("patientId"));
  const doctorName = String(formData.get("doctorName") || "").trim();
  const clinicName = String(formData.get("clinicName") || "").trim() || null;
  const prescriptionDate = String(formData.get("prescriptionDate") || istDate(new Date()));
  const diagnosis = String(formData.get("diagnosis") || "PCOS").trim();
  const phenotypeRaw = String(formData.get("phenotype") || "");
  const phenotype =
    phenotypeRaw === "insulin_resistant" ||
    phenotypeRaw === "adrenal_stress" ||
    phenotypeRaw === "inflammatory" ||
    phenotypeRaw === "post_pill"
      ? phenotypeRaw
      : null;

  const dietaryAdvice = String(formData.get("dietaryAdvice") || "").trim() || null;
  const exerciseAdvice = String(formData.get("exerciseAdvice") || "").trim() || null;
  const followUpDate = String(formData.get("followUpDate") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  // Extract dynamically submitted medications
  const medsJson = formData.get("medicationsJson");
  let medsList: { name: string; dose: string; frequency: string; notes?: string }[] = [];
  if (typeof medsJson === "string" && medsJson.trim()) {
    try {
      medsList = JSON.parse(medsJson);
    } catch {
      medsList = [];
    }
  } else {
    // Fallback reading individual fields
    const med1Name = String(formData.get("med1_name") || "").trim();
    if (med1Name) {
      medsList.push({
        name: med1Name,
        dose: String(formData.get("med1_dose") || "Standard").trim(),
        frequency: String(formData.get("med1_freq") || "Once daily").trim(),
      });
    }
  }

  // Extract dynamically submitted supplements
  const suppsJson = formData.get("supplementsJson");
  let suppsList: { name: string; dose: string; frequency: string }[] = [];
  if (typeof suppsJson === "string" && suppsJson.trim()) {
    try {
      suppsList = JSON.parse(suppsJson);
    } catch {
      suppsList = [];
    }
  } else {
    const supp1Name = String(formData.get("supp1_name") || "").trim();
    if (supp1Name) {
      suppsList.push({
        name: supp1Name,
        dose: String(formData.get("supp1_dose") || "Standard").trim(),
        frequency: String(formData.get("supp1_freq") || "Once daily").trim(),
      });
    }
  }

  if (!doctorName) {
    throw new Error("Doctor name is required");
  }

  await db.transaction(async (tx) => {
    // 1. Insert prescription
    const [rx] = await tx
      .insert(pcosPrescriptions)
      .values({
        patientId,
        loggedBy: user.id,
        doctorName,
        clinicName,
        prescriptionDate,
        diagnosis,
        phenotype,
        medications: medsList,
        supplements: suppsList,
        dietaryAdvice,
        exerciseAdvice,
        followUpDate: followUpDate || null,
        notes,
        active: true,
      })
      .returning({ id: pcosPrescriptions.id });

    // 2. Also register active prescribed medications into standard medications table
    for (const med of medsList) {
      if (med.name) {
        const timeSlot = med.frequency.toLowerCase().includes("twice")
          ? ["09:00", "21:00"]
          : med.frequency.toLowerCase().includes("three")
            ? ["08:00", "14:00", "20:00"]
            : ["09:00"];

        await tx.insert(medications).values({
          patientId,
          loggedBy: user.id,
          name: med.name,
          dose: med.dose || "",
          times: timeSlot,
          active: true,
        });
      }
    }

    await audit(
      {
        actorUserId: user.id,
        patientId,
        action: "pcos_prescription_recorded",
        detail: { doctorName, prescriptionId: rx.id, medsCount: medsList.length },
      },
      tx
    );
  });

  redirect(`/pcos/onboarding?p=${patientId}`);
}

/**
 * 3. Save Onboarding Quiz & Classify Phenotype
 */
export async function savePcosProfileAction(formData: FormData) {
  const user = await requireUser();
  const patientId = String(formData.get("patientId"));
  if (!patientId) throw new Error("Missing patientId");

  const answersRaw = String(formData.get("answersJson") || "{}");
  let answers: OnboardingAnswers;
  try {
    answers = JSON.parse(answersRaw);
  } catch {
    answers = {
      diagnosedWhen: (formData.get("diagnosis_time") as any) || "recent",
      wasBirthControl: formData.get("was_birth_control") === "true",
      weightDistribution: (formData.get("weight_dist") as any) || "midsection",
      skinHairConcerns: (formData.getAll("concerns") as string[]) || [],
      stressLevel: (formData.get("stress") as any) || "constant",
      sleepPattern: (formData.get("sleep") as any) || "midnight_2am",
      eatingPattern: (formData.get("eating") as any) || "skip_breakfast",
      triedBefore: (formData.getAll("tried") as string[]) || [],
      topPriority: (formData.get("priority") as any) || "periods",
    };
  }

  // Get active prescription to feed into the classification engine
  const [rx] = await db
    .select()
    .from(pcosPrescriptions)
    .where(eq(pcosPrescriptions.patientId, patientId))
    .orderBy(pcosPrescriptions.createdAt)
    .limit(1);

  const prescriptionData = {
    medications: (rx?.medications as any) || [],
    supplements: (rx?.supplements as any) || [],
    phenotype: rx?.phenotype || null,
  };

  // Run the scientific classification
  const phenotype = classifyPhenotype(answers, prescriptionData);

  // Store in pcos_profiles table
  await db
    .insert(pcosProfiles)
    .values({
      patientId,
      prescriptionId: rx?.id,
      phenotype,
      onboardingAnswers: answers,
      cycleBaselineLength: 45, // default flexible baseline for PCOS
      diagnosisDate: rx?.prescriptionDate,
    })
    .onConflictDoUpdate({
      target: pcosProfiles.patientId,
      set: {
        phenotype,
        onboardingAnswers: answers,
        prescriptionId: rx?.id,
      },
    });

  await audit({
    actorUserId: user.id,
    patientId,
    action: "pcos_profile_created",
    detail: { phenotype, hasPrescription: Boolean(rx) },
  });

  redirect(`/pcos/today?p=${patientId}`);
}

/**
 * 4. Toggle Daily Action Completion
 */
export async function toggleDailyAction(patientId: string, actionKey: string, completed: boolean) {
  const user = await requireUser();
  const current = await now();
  const today = istDate(current);

  const existing = await db
    .select()
    .from(pcosDailyActions)
    .where(
      and(
        eq(pcosDailyActions.patientId, patientId),
        eq(pcosDailyActions.date, today),
        eq(pcosDailyActions.actionKey, actionKey)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pcosDailyActions)
      .set({ completed })
      .where(eq(pcosDailyActions.id, existing[0].id));
  } else {
    await db.insert(pcosDailyActions).values({
      patientId,
      loggedBy: user.id,
      date: today,
      actionKey,
      completed,
    });
  }

  revalidatePath(`/pcos/today`);
}

/**
 * 5. Log a Grace Day (Forgiveness Engine)
 */
export async function recordGraceDayAction(patientId: string, reason: GraceDayReason) {
  const user = await requireUser();
  const current = await now();
  const today = istDate(current);

  await db
    .insert(graceDays)
    .values({
      patientId,
      loggedBy: user.id,
      date: today,
      reason,
    })
    .onConflictDoUpdate({
      target: [graceDays.patientId, graceDays.date],
      set: { reason },
    });

  revalidatePath(`/pcos/today`);
}

/**
 * 6. Save Daily Symptoms
 */
export async function saveSymptomLogAction(
  patientId: string,
  category: SymptomCategory,
  severity: number,
  notes?: string
) {
  const user = await requireUser();
  const current = await now();
  const today = istDate(current);

  await db.insert(symptomLogs).values({
    patientId,
    loggedBy: user.id,
    date: today,
    category,
    severity,
    notes: notes || null,
  });

  revalidatePath(`/pcos/symptoms`);
  revalidatePath(`/pcos/today`);
}

/**
 * 7. Save Food Pairing Log (Addition-First)
 */
export async function savePcosFoodLogAction(formData: FormData) {
  const user = await requireUser();
  const patientId = String(formData.get("patientId"));
  const slot = (formData.get("slot") as MealSlot) || "breakfast";
  const items = formData.getAll("items") as string[];
  const preMealAction = String(formData.get("preMealAction") || "").trim() || null;
  const postMealAction = String(formData.get("postMealAction") || "").trim() || null;

  const current = await now();
  const today = istDate(current);

  await db.insert(pcosFoodLogs).values({
    patientId,
    loggedBy: user.id,
    date: today,
    slot,
    items,
    preMealAction,
    postMealAction,
    eatenAt: current,
  });

  redirect(`/pcos/food?p=${patientId}`);
}

/**
 * 8. Save Cycle Log (Irregular-cycle Friendly)
 */
export async function saveCycleLogAction(formData: FormData) {
  const user = await requireUser();
  const patientId = String(formData.get("patientId"));
  const startDate = String(formData.get("startDate"));
  const endDate = String(formData.get("endDate") || "").trim() || null;
  const flowIntensityRaw = formData.get("flowIntensity");
  const flowIntensity = flowIntensityRaw ? Number(flowIntensityRaw) : null;
  const symptoms = formData.getAll("symptoms") as string[];
  const notes = String(formData.get("notes") || "").trim() || null;

  await db.insert(cycleLogs).values({
    patientId,
    loggedBy: user.id,
    startDate,
    endDate,
    flowIntensity,
    symptoms,
    notes,
  });

  redirect(`/pcos/cycle?p=${patientId}`);
}
