import type { TriageLevel } from "@/db/schema";

/**
 * Symptom triage, safety layer.
 *
 * These hard-coded red-flag rules run BEFORE any AI. They set a floor: the AI may
 * raise the level but can never lower it, and on an emergency the AI is not called
 * at all. The output is always a triage level (where to go, how fast), never a diagnosis.
 */

export const LEVEL_ORDER: TriageLevel[] = ["self_care", "doctor", "urgent", "emergency"];

export function higher(a: TriageLevel, b: TriageLevel): TriageLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

export const LEVEL_COPY: Record<TriageLevel, { title: string; action: string; hiTitle: string; hiAction: string }> = {
  emergency: {
    title: "Emergency: get help now",
    action: "Call 112 (or 108 for an ambulance) now. Do not drive yourself. Stay with the person.",
    hiTitle: "आपातकाल: अभी मदद लें",
    hiAction: "अभी 112 या एम्बुलेंस के लिए 108 पर कॉल करें। खुद गाड़ी न चलाएँ। व्यक्ति के साथ रहें।",
  },
  urgent: {
    title: "See a doctor today",
    action: "Visit a clinic or hospital today, or book a video consult in the next few hours.",
    hiTitle: "आज ही डॉक्टर को दिखाएँ",
    hiAction: "आज ही क्लिनिक या अस्पताल जाएँ, या अगले कुछ घंटों में वीडियो परामर्श बुक करें।",
  },
  doctor: {
    title: "Book a doctor visit",
    action: "Book an appointment in the next 1–2 days. Go sooner if things get worse.",
    hiTitle: "डॉक्टर से मिलने का समय लें",
    hiAction: "अगले 1–2 दिनों में अपॉइंटमेंट लें। हालत बिगड़े तो पहले जाएँ।",
  },
  self_care: {
    title: "Care at home and watch",
    action: "Rest, drink fluids and keep an eye on symptoms. Book a doctor if they last or get worse.",
    hiTitle: "घर पर देखभाल करें और नज़र रखें",
    hiAction: "आराम करें, पानी पिएँ और लक्षणों पर नज़र रखें। लक्षण बने रहें या बढ़ें तो डॉक्टर को दिखाएँ।",
  },
};

/** Quick yes/no questions shown as large toggles; they don't depend on how well text matching works. */
export const RED_FLAG_QUESTIONS = [
  { key: "chestPain", label: "Chest pain, pressure or tightness", hi: "सीने में दर्द या दबाव" },
  { key: "sweating", label: "Cold sweat or clammy skin", hi: "ठंडा पसीना" },
  { key: "breathless", label: "Hard to breathe or lips turning blue", hi: "साँस लेने में तकलीफ़" },
  { key: "strokeSigns", label: "Face drooping, arm weakness or slurred speech", hi: "चेहरा टेढ़ा, हाथ में कमज़ोरी या बोलने में दिक्कत" },
  { key: "unconscious", label: "Fainted, fit (seizure) or very hard to wake", hi: "बेहोशी, दौरा या जगाने में मुश्किल" },
  { key: "bleeding", label: "Heavy bleeding or vomiting blood", hi: "ज़्यादा खून बहना या खून की उल्टी" },
  { key: "confusion", label: "Sudden confusion", hi: "अचानक उलझन" },
  { key: "selfHarm", label: "Thoughts of self-harm", hi: "खुद को नुकसान पहुँचाने के विचार" },
] as const;

export type RedFlagKey = (typeof RED_FLAG_QUESTIONS)[number]["key"];

export type TriageInput = {
  symptoms: string;
  flags: Partial<Record<RedFlagKey, boolean>>;
  ageYears: number | null;
  durationDays?: number | null;
  severity?: number | null; // 1-10
  temperatureF?: number | null;
  spo2?: number | null;
  pregnant?: boolean;
  knownAllergies?: string[];
};

export type RedFlag = { code: string; reason: string; level: TriageLevel };

export type RuleResult = {
  level: TriageLevel;
  redFlags: RedFlag[];
  /** True when the rules alone decide (emergency): the AI must not be called. */
  final: boolean;
};

// Words in English, Hinglish and Hindi. Kept deliberately broad: a false alarm costs
// a phone call, a missed emergency costs much more.
const SYN = {
  chestPain: ["chest pain", "chest tightness", "chest pressure", "pressure in chest", "pain in chest", "tight chest", "seene me dard", "seene mein dard", "chhati me dard", "chhati mein dard", "सीने में दर्द", "छाती में दर्द", "सीने में दबाव"],
  sweating: ["sweat", "clammy", "pasina", "paseena", "पसीना"],
  breathless: ["breathless", "short of breath", "shortness of breath", "can't breathe", "cant breathe", "cannot breathe", "difficulty breathing", "trouble breathing", "hard to breathe", "gasping", "blue lips", "saans nahi", "saans lene", "साँस", "सांस"],
  radiating: ["left arm", "jaw pain", "pain in jaw", "arm pain", "pain spreading", "बाएं हाथ", "जबड़े"],
  nausea: ["nausea", "vomit", "ulti", "उल्टी", "जी मिचला"],
  strokeSigns: ["face droop", "face drooping", "slurred", "can't speak", "cannot speak", "one side weak", "weakness on one side", "arm weakness", "numb on one side", "lakwa", "लकवा", "बोलने में दिक्कत", "मुँह टेढ़ा"],
  unconscious: ["unconscious", "fainted", "passed out", "not responding", "unresponsive", "seizure", "convulsion", "fit ", "behosh", "बेहोश", "दौरा"],
  bleeding: ["vomiting blood", "blood in vomit", "coughing blood", "heavy bleeding", "bleeding won't stop", "bleeding wont stop", "खून की उल्टी", "बहुत खून"],
  confusion: ["confused", "confusion", "disoriented", "not making sense", "उलझन", "भ्रम"],
  selfHarm: ["suicide", "kill myself", "end my life", "self harm", "self-harm", "want to die", "marna chahta", "marna chahti", "आत्महत्या", "मरना चाहता", "मरना चाहती"],
  throatSwelling: ["throat swelling", "throat is closing", "swollen throat", "swollen lips", "swollen tongue", "tongue swelling", "face swelling", "गला सूज", "होंठ सूज"],
  stiffNeck: ["stiff neck", "neck stiffness", "गर्दन में अकड़", "gardan akad"],
  fever: ["fever", "bukhar", "बुखार", "high temperature"],
  severeAbdominal: ["severe stomach pain", "severe abdominal pain", "severe belly pain", "pet me tez dard", "pet mein tez dard", "पेट में तेज़ दर्द", "पेट में तेज दर्द"],
  pregnancyBleeding: ["pregnant and bleeding", "bleeding in pregnancy", "pregnancy bleeding"],
  headacheWorst: ["worst headache", "sudden severe headache", "thunderclap"],
  rash: ["rash", "hives", "दाने"],
} as const;

type SynKey = keyof typeof SYN;

export function detectSymptoms(text: string): Set<SynKey> {
  const t = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const found = new Set<SynKey>();
  for (const key of Object.keys(SYN) as SynKey[]) {
    if (SYN[key].some((w) => t.includes(w))) found.add(key);
  }
  return found;
}

export function evaluateRedFlags(input: TriageInput): RuleResult {
  const s = detectSymptoms(input.symptoms);
  const has = (k: SynKey | RedFlagKey) =>
    (k in input.flags && Boolean(input.flags[k as RedFlagKey])) || s.has(k as SynKey);
  const flags: RedFlag[] = [];
  const add = (code: string, reason: string, level: TriageLevel) => flags.push({ code, reason, level });
  const age = input.ageYears;

  // ---- Emergency ----
  if (has("chestPain") && (has("sweating") || has("breathless") || s.has("radiating") || s.has("nausea"))) {
    add("cardiac", "Chest pain with sweating, breathlessness or pain spreading to the arm or jaw can be a heart emergency.", "emergency");
  }
  if (has("strokeSigns")) {
    add("stroke", "Face drooping, arm weakness or slurred speech can be signs of a stroke. Every minute matters.", "emergency");
  }
  if (has("breathless") && (input.severity ?? 0) >= 7) {
    add("breathing", "Severe difficulty breathing needs emergency care.", "emergency");
  }
  if (input.spo2 != null && input.spo2 < 92) {
    add("low_oxygen", `Oxygen level of ${input.spo2}% is dangerously low.`, "emergency");
  }
  if (has("unconscious")) {
    add("unconscious", "Fainting, a seizure or being very hard to wake needs emergency care.", "emergency");
  }
  if (has("bleeding")) {
    add("bleeding", "Heavy bleeding or vomiting blood needs emergency care.", "emergency");
  }
  if (s.has("throatSwelling") && (has("breathless") || s.has("rash"))) {
    add("anaphylaxis", "Swelling of the face or throat with breathing trouble or rash can be a severe allergic reaction.", "emergency");
  }
  if (has("selfHarm")) {
    add("self_harm", "Thoughts of self-harm deserve immediate support. Tele-MANAS: 14416 (free, 24×7).", "emergency");
  }
  if (s.has("fever") && s.has("stiffNeck")) {
    add("meningitis", "Fever with a stiff neck needs to be checked in a hospital right away.", "emergency");
  }
  if (has("confusion") && (age == null || age >= 60 || s.has("fever"))) {
    add("confusion", "Sudden confusion in an older person or with fever needs emergency care.", "emergency");
  }
  if (input.pregnant && (s.has("pregnancyBleeding") || s.has("severeAbdominal") || has("bleeding"))) {
    add("pregnancy", "Bleeding or severe pain in pregnancy needs emergency care.", "emergency");
  }
  if (s.has("headacheWorst")) {
    add("headache", "A sudden, severe 'worst ever' headache needs emergency care.", "emergency");
  }

  // ---- Urgent (today) ----
  if (has("chestPain") && !flags.some((f) => f.code === "cardiac")) {
    add("chest_pain", "Any new chest pain should be checked by a doctor today.", age != null && age >= 40 ? "urgent" : "urgent");
  }
  if (has("breathless") && !flags.some((f) => f.code === "breathing")) {
    add("breathless", "New breathlessness should be checked by a doctor today.", "urgent");
  }
  if (input.temperatureF != null && input.temperatureF >= 103) {
    add("high_fever", `A temperature of ${input.temperatureF}°F is high.`, "urgent");
  }
  if (s.has("fever") && age != null && age < 1) {
    add("infant_fever", "Fever in a baby under one year should be seen by a doctor today.", "urgent");
  }
  if (s.has("severeAbdominal")) {
    add("abdominal", "Severe stomach pain should be checked today.", "urgent");
  }
  if ((input.severity ?? 0) >= 8) {
    add("severe_pain", "Very severe symptoms (8 or more out of 10) should be checked today.", "urgent");
  }
  if (input.knownAllergies?.length && s.has("throatSwelling") && !flags.some((f) => f.code === "anaphylaxis")) {
    add("allergy", "Swelling in someone with known allergies should be checked today.", "urgent");
  }

  // ---- Doctor visit (1–2 days) ----
  if ((input.durationDays ?? 0) >= 7) {
    add("long_duration", "Symptoms lasting a week or more should be seen by a doctor.", "doctor");
  }
  if (s.has("fever") && (input.durationDays ?? 0) >= 3) {
    add("fever_3_days", "Fever for 3 days or more should be checked by a doctor.", "doctor");
  }
  if (s.has("fever") && age != null && age >= 65) {
    add("elderly_fever", "Fever in someone over 65 is worth a doctor's check.", "doctor");
  }
  if ((input.severity ?? 0) >= 5 && (input.severity ?? 0) < 8) {
    add("moderate", "Moderate symptoms (5–7 out of 10) are worth a doctor's opinion.", "doctor");
  }

  const level = flags.reduce<TriageLevel>((acc, f) => higher(acc, f.level), "self_care");
  return { level, redFlags: flags, final: level === "emergency" };
}

/**
 * Combines the rule floor with the AI's suggestion. The AI can only make things
 * more cautious, never less.
 */
export function combineLevels(ruleLevel: TriageLevel, aiLevel: TriageLevel | null | undefined): TriageLevel {
  if (!aiLevel) return ruleLevel;
  return higher(ruleLevel, aiLevel);
}

/** Phrases that read like a diagnosis. AI text containing them is dropped. */
const DIAGNOSIS_PATTERNS = [/\byou (have|are suffering from|definitely)\b/i, /\bdiagnos(is|ed|e)\b/i, /\bit is (a|an) [a-z]+ (infection|disease|attack)\b/i, /\bprescrib/i, /\btake \d+\s?mg\b/i];

export function looksLikeDiagnosis(text: string): boolean {
  return DIAGNOSIS_PATTERNS.some((p) => p.test(text));
}
