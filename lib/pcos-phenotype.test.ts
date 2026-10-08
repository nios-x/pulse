import { describe, it, expect } from 'vitest';
import { classifyPhenotype } from './pcos-phenotype';
import type { OnboardingAnswers, PrescriptionData } from './pcos-phenotype';

const defaultAnswers: OnboardingAnswers = {
  diagnosedWhen: 'recent',
  wasBirthControl: false,
  weightDistribution: 'even',
  skinHairConcerns: [],
  stressLevel: 'managing',
  sleepPattern: 'before_midnight',
  eatingPattern: 'regular_3meals',
  triedBefore: [],
  topPriority: 'periods',
};

describe('classifyPhenotype', () => {
  it('uses doctor specified phenotype if provided', () => {
    const rx: PrescriptionData = { medications: [], supplements: [], phenotype: 'inflammatory' };
    expect(classifyPhenotype(defaultAnswers, rx)).toBe('inflammatory');
  });

  it('detects insulin resistant from metformin', () => {
    const rx: PrescriptionData = { medications: [{ name: 'Metformin 500mg', dose: '500mg' }], supplements: [] };
    expect(classifyPhenotype(defaultAnswers, rx)).toBe('insulin_resistant');
  });

  it('detects adrenal stress from spironolactone', () => {
    const rx: PrescriptionData = { medications: [{ name: 'Spironolactone', dose: '50mg' }], supplements: [] };
    expect(classifyPhenotype(defaultAnswers, rx)).toBe('adrenal_stress');
  });

  it('detects post pill from answers', () => {
    const answers = { ...defaultAnswers, wasBirthControl: true };
    const rx: PrescriptionData = { medications: [], supplements: [] };
    expect(classifyPhenotype(answers, rx)).toBe('post_pill');
  });

  it('detects adrenal stress from lifestyle', () => {
    const answers = { ...defaultAnswers, stressLevel: 'constant', weightDistribution: 'lean', sleepPattern: 'chaotic' } as const;
    const rx: PrescriptionData = { medications: [], supplements: [] };
    expect(classifyPhenotype(answers, rx)).toBe('adrenal_stress');
  });

  it('defaults to insulin resistant', () => {
    const rx: PrescriptionData = { medications: [], supplements: [] };
    expect(classifyPhenotype(defaultAnswers, rx)).toBe('insulin_resistant');
  });
});
