export type OnboardingAnswers = {
  diagnosedWhen: 'recent' | '1_3_years' | '3_plus_years' | 'suspected';
  wasBirthControl: boolean;
  weightDistribution: 'midsection' | 'even' | 'lean' | 'prefer_not';
  skinHairConcerns: string[];
  stressLevel: 'managing' | 'constant' | 'panic_anxiety';
  sleepPattern: 'before_midnight' | 'midnight_2am' | 'after_2am' | 'chaotic';
  eatingPattern: 'regular_3meals' | 'skip_breakfast' | 'eat_when_remember' | 'restrict_binge';
  triedBefore: string[];
  topPriority: 'periods' | 'skin' | 'energy' | 'weight' | 'fertility' | 'all';
};

export type PrescriptionData = {
  medications: { name: string; dose: string }[];
  supplements: { name: string }[];
  phenotype?: string | null;
};

export type PcosPhenotype = 'insulin_resistant' | 'adrenal_stress' | 'inflammatory' | 'post_pill';

export function classifyPhenotype(answers: OnboardingAnswers, prescription: PrescriptionData): PcosPhenotype {
  // 1. If doctor specified phenotype in prescription → use it directly
  if (prescription.phenotype) {
    return prescription.phenotype as PcosPhenotype;
  }

  const meds = prescription.medications.map(m => m.name.toLowerCase());

  // 2. If prescription has metformin/berberine → strong insulin_resistant signal
  if (meds.some(m => m.includes('metformin') || m.includes('berberine'))) {
    return 'insulin_resistant';
  }

  // 3. If prescription has spironolactone → strong adrenal signal
  if (meds.some(m => m.includes('spironolactone'))) {
    return 'adrenal_stress';
  }

  // 4. If user was on birth control before symptoms → post_pill signal
  if (answers.wasBirthControl) {
    return 'post_pill';
  }

  // 5. If constant stress + lean + poor sleep → adrenal_stress
  if (answers.stressLevel === 'constant' && answers.weightDistribution === 'lean' && (answers.sleepPattern === 'after_2am' || answers.sleepPattern === 'chaotic')) {
    return 'adrenal_stress';
  }

  // 6. If midsection weight + sugar cravings → insulin_resistant
  if (answers.weightDistribution === 'midsection') {
    // Note: craving logic usually depends on more answers, but we approximate
    return 'insulin_resistant';
  }

  // 7. If fatigue + bloating dominant → inflammatory
  if (answers.skinHairConcerns.includes('bloating') || answers.topPriority === 'energy') {
    return 'inflammatory';
  }

  // 8. Default: insulin_resistant (most common, 70-80%)
  return 'insulin_resistant';
}
