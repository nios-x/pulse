import { z } from 'zod';

export const pcosOnboardingSchema = z.object({
  diagnosedWhen: z.enum(['recent', '1_3_years', '3_plus_years', 'suspected']),
  wasBirthControl: z.boolean(),
  weightDistribution: z.enum(['midsection', 'even', 'lean', 'prefer_not']),
  skinHairConcerns: z.array(z.string()),
  stressLevel: z.enum(['managing', 'constant', 'panic_anxiety']),
  sleepPattern: z.enum(['before_midnight', 'midnight_2am', 'after_2am', 'chaotic']),
  eatingPattern: z.enum(['regular_3meals', 'skip_breakfast', 'eat_when_remember', 'restrict_binge']),
  triedBefore: z.array(z.string()),
  topPriority: z.enum(['periods', 'skin', 'energy', 'weight', 'fertility', 'all']),
});

export const pcosPrescriptionSchema = z.object({
  doctorName: z.string().min(1, 'Doctor name is required'),
  clinicName: z.string().optional(),
  prescriptionDate: z.string().min(1, 'Date is required'),
  diagnosis: z.string().default('pcos'),
  phenotype: z.enum(['insulin_resistant', 'adrenal_stress', 'inflammatory', 'post_pill']).optional().nullable(),
  medications: z.array(z.object({
    name: z.string().min(1, 'Medication name is required'),
    dose: z.string(),
    frequency: z.string(),
    notes: z.string().optional(),
  })),
  supplements: z.array(z.object({
    name: z.string().min(1, 'Supplement name is required'),
    dose: z.string(),
    frequency: z.string(),
  })),
  dietaryAdvice: z.string().optional(),
  exerciseAdvice: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export const symptomLogSchema = z.object({
  date: z.string(),
  category: z.enum([
    'acne_jawline', 'acne_forehead', 'hirsutism_face', 'hirsutism_body',
    'hair_thinning', 'acanthosis', 'bloating', 'fatigue', 'brain_fog',
    'anxiety', 'low_mood', 'irritability', 'craving_sugar', 'craving_carb',
    'pelvic_pain', 'headache', 'insomnia', 'night_waking'
  ]),
  severity: z.number().min(1).max(5),
  notes: z.string().optional(),
});

export const cycleLogSchema = z.object({
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  flowIntensity: z.number().min(1).max(5).optional().nullable(),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const pcosFoodLogSchema = z.object({
  date: z.string(),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  items: z.array(z.string()).min(1),
  preMealAction: z.string().optional(),
  postMealAction: z.string().optional(),
  eatenAt: z.string().optional(),
});

export const supplementLogSchema = z.object({
  date: z.string(),
  supplement: z.string().min(1),
  takenAt: z.string().optional(),
});

export const movementLogSchema = z.object({
  date: z.string(),
  type: z.enum([
    'walk_10min', 'walk_30min', 'strength_training', 'yoga_gentle',
    'yoga_restorative', 'pilates', 'swimming', 'dance', 'stretching',
    'breathing_exercise', 'rest_day'
  ]),
  durationMinutes: z.number().optional(),
});

export const sleepLogSchema = z.object({
  date: z.string(),
  bedtime: z.string().optional(),
  wakeTime: z.string().optional(),
  quality: z.number().min(1).max(5).optional(),
});

export const graceDaySchema = z.object({
  date: z.string(),
  reason: z.enum(['flare_up', 'period', 'travel', 'mental_health', 'sick']),
});

export const dailyActionSchema = z.object({
  date: z.string(),
  actionKey: z.string().min(1),
  completed: z.boolean(),
});
