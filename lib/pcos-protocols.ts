import type { PcosPhenotype } from './pcos-phenotype';

export type DailyAction = {
  key: string;
  timeBlock: 'morning' | 'midday' | 'afternoon' | 'evening' | 'anytime';
  label: { en: string; hi: string };
  description: { en: string; hi: string };
  fromPrescription: boolean;
};

export function getDailyProtocol(
  phenotype: PcosPhenotype,
  prescribedMeds: { name: string; dose: string; frequency: string }[],
  prescribedSupplements: { name: string; dose: string; frequency: string }[]
): DailyAction[] {
  const actions: DailyAction[] = [];

  // Prescription-based actions
  prescribedMeds.forEach(med => {
    actions.push({
      key: `med_${med.name}`,
      timeBlock: med.frequency.includes('morning') ? 'morning' : med.frequency.includes('night') ? 'evening' : 'anytime',
      label: { en: `Take ${med.name} (${med.dose})`, hi: `${med.name} लें (${med.dose})` },
      description: { en: 'As prescribed by your doctor', hi: 'जैसा आपके डॉक्टर ने सुझाया है' },
      fromPrescription: true,
    });
  });

  prescribedSupplements.forEach(supp => {
    actions.push({
      key: `supp_${supp.name}`,
      timeBlock: supp.frequency.includes('morning') ? 'morning' : supp.frequency.includes('night') ? 'evening' : 'anytime',
      label: { en: `Take ${supp.name} (${supp.dose})`, hi: `${supp.name} लें (${supp.dose})` },
      description: { en: 'As recommended by your doctor', hi: 'जैसा आपके डॉक्टर ने सुझाया है' },
      fromPrescription: true,
    });
  });

  // General actions shared by all
  actions.push({
    key: 'balanced_breakfast',
    timeBlock: 'morning',
    label: { en: 'Balanced Breakfast', hi: 'संतुलित नाश्ता' },
    description: { en: 'Eat a breakfast with protein', hi: 'प्रोटीन युक्त नाश्ता खाएं' },
    fromPrescription: false,
  });
  actions.push({
    key: 'post_meal_walk',
    timeBlock: 'afternoon',
    label: { en: 'Post-Meal Walk', hi: 'भोजन के बाद की सैर' },
    description: { en: '10-minute walk after your biggest meal', hi: 'अपने सबसे बड़े भोजन के बाद 10 मिनट की सैर' },
    fromPrescription: false,
  });
  actions.push({
    key: 'hydration',
    timeBlock: 'anytime',
    label: { en: 'Hydration', hi: 'हाइड्रेशन' },
    description: { en: 'Drink 8 glasses of water', hi: '8 गिलास पानी पिएं' },
    fromPrescription: false,
  });
  actions.push({
    key: 'sleep_by_midnight',
    timeBlock: 'evening',
    label: { en: 'Sleep by Midnight', hi: 'आधी रात तक सोएं' },
    description: { en: 'Screen off and lights out', hi: 'स्क्रीन बंद और लाइट बंद' },
    fromPrescription: false,
  });

  // Phenotype specific actions
  if (phenotype === 'insulin_resistant') {
    actions.push({
      key: 'protein_first',
      timeBlock: 'anytime',
      label: { en: 'Protein First', hi: 'प्रोटीन पहले' },
      description: { en: 'Eat protein/fiber before carbs', hi: 'कार्ब्स से पहले प्रोटीन/फाइबर खाएं' },
      fromPrescription: false,
    });
    actions.push({
      key: 'no_naked_carbs',
      timeBlock: 'anytime',
      label: { en: 'Pair Your Carbs', hi: 'कार्ब्स के साथ जोड़ें' },
      description: { en: 'Add fat or protein to every carb', hi: 'हर कार्ब में वसा या प्रोटीन मिलाएं' },
      fromPrescription: false,
    });
  } else if (phenotype === 'adrenal_stress') {
    actions.push({
      key: 'no_phone_morning',
      timeBlock: 'morning',
      label: { en: 'No Phone Morning', hi: 'सुबह फोन नहीं' },
      description: { en: 'No phone for 20 min after waking', hi: 'जागने के 20 मिनट बाद तक फोन नहीं' },
      fromPrescription: false,
    });
    actions.push({
      key: 'breathing_5min',
      timeBlock: 'anytime',
      label: { en: '5-Minute Breathing', hi: '5 मिनट साँस लेने का व्यायाम' },
      description: { en: '5-minute box breathing', hi: '5 मिनट बॉक्स ब्रीदिंग' },
      fromPrescription: false,
    });
    actions.push({
      key: 'no_hiit',
      timeBlock: 'anytime',
      label: { en: 'Gentle Movement', hi: 'हल्की हरकत' },
      description: { en: 'Gentle movement today (no HIIT)', hi: 'आज हल्की हरकत (कोई HIIT नहीं)' },
      fromPrescription: false,
    });
  } else if (phenotype === 'inflammatory') {
    actions.push({
      key: 'anti_inflam_food',
      timeBlock: 'anytime',
      label: { en: 'Anti-Inflammatory Food', hi: 'सूजन-रोधी भोजन' },
      description: { en: 'Add turmeric, ginger, or omega-3 to a meal', hi: 'भोजन में हल्दी, अदरक, या ओमेगा-3 शामिल करें' },
      fromPrescription: false,
    });
    actions.push({
      key: 'gut_health',
      timeBlock: 'anytime',
      label: { en: 'Gut Health', hi: 'आंत का स्वास्थ्य' },
      description: { en: 'Eat a fermented food (curd, kimchi)', hi: 'किण्वित भोजन (दही, किमची) खाएं' },
      fromPrescription: false,
    });
  } else if (phenotype === 'post_pill') {
    actions.push({
      key: 'liver_support',
      timeBlock: 'morning',
      label: { en: 'Liver Support', hi: 'लिवर सपोर्ट' },
      description: { en: 'Drink warm lemon water in the morning', hi: 'सुबह गर्म नींबू पानी पिएं' },
      fromPrescription: false,
    });
    actions.push({
      key: 'cruciferous_veg',
      timeBlock: 'anytime',
      label: { en: 'Cruciferous Veggies', hi: 'क्रूसिफेरस सब्जियां' },
      description: { en: 'Eat a cruciferous vegetable today', hi: 'आज एक क्रूसिफेरस सब्जी खाएं' },
      fromPrescription: false,
    });
  }

  return actions;
}
