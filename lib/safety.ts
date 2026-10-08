// Safety rules and safety copy. Fixed code, written and reviewed by the team,
// never generated at runtime. The app says when to reach a human; it never
// says what dose to take. The English copy is from the build plan; the Hindi
// copy is a draft that the team must review before any real patient uses it.

import { interpolate, type Locale, type TranslateVars } from "@/lib/i18n";

export const HELPLINES = {
  ambulance: "108",
  emergency: "112",
  teleManas: "14416",
  teleManasAlt: "1-800-891-4416",
} as const;

/** Fixed limits. glucoseLow / glucoseHigh are per patient (doctor's instruction). */
export const URGENT_LOW = 54;
export const URGENT_HIGH = 400;
export const MISSED_DOSE_LIMIT = 3; // in 2 days
export const NO_LOG_DAYS = 3;
export const MOOD_FOLLOW_UP_SCORE = 3;

export type AlertKind =
  | "glucose_very_low"
  | "glucose_low"
  | "glucose_high"
  | "glucose_very_high"
  | "support_request";
export type Severity = "warning" | "urgent";
export type SafetyResult = { kind: AlertKind; severity: Severity };

export function evaluateGlucose(
  mgdl: number,
  patient: { glucoseLow: number; glucoseHigh: number }
): SafetyResult | null {
  if (mgdl < URGENT_LOW) return { kind: "glucose_very_low", severity: "urgent" };
  if (mgdl >= URGENT_HIGH) return { kind: "glucose_very_high", severity: "urgent" };
  if (mgdl < patient.glucoseLow) return { kind: "glucose_low", severity: "warning" };
  if (mgdl >= patient.glucoseHigh) return { kind: "glucose_high", severity: "warning" };
  return null;
}

/** Caregivers only: 3 or more missed doses since yesterday. */
export function evaluateMissedDoses(missed: number): { kind: "missed_doses"; count: number } | null {
  return missed >= MISSED_DOSE_LIMIT ? { kind: "missed_doses", count: missed } : null;
}

/** Caregivers only: nothing logged for 3 days (not counting a brand-new profile). */
export function evaluateNoLogs(
  lastLogAt: Date | null,
  profileCreatedAt: Date,
  now: Date
): { kind: "no_logs"; days: number } | null {
  const since = lastLogAt ?? profileCreatedAt;
  const days = Math.floor((now.getTime() - since.getTime()) / 86_400_000);
  return days >= NO_LOG_DAYS ? { kind: "no_logs", days } : null;
}

/** PHQ-2: two questions, 0 to 3 each. Screens, never diagnoses. */
export function scoreMoodCheck(q1: number, q2: number) {
  const score = q1 + q2;
  return { score, needsFollowUp: score >= MOOD_FOLLOW_UP_SCORE };
}

export type MoodOutcome = "ok" | "support" | "crisis";
export function moodOutcome(score: number, selfHarm: boolean | null): MoodOutcome {
  if (selfHarm) return "crisis";
  return score >= MOOD_FOLLOW_UP_SCORE ? "support" : "ok";
}

// ---------- Copy ----------

type Copy = Record<Locale, string>;

export const SAFETY_COPY = {
  glucose_very_low: {
    en: "Very low sugar. Follow your doctor's low-sugar plan now. If confused or fainting, call 108.",
    hi: "शुगर बहुत कम है। अभी अपने डॉक्टर का बताया लो-शुगर प्लान अपनाएँ। अगर उलझन हो या बेहोशी आए, तो 108 पर कॉल करें।",
  },
  glucose_low: {
    en: "Low sugar. Follow your doctor's low-sugar plan and check again soon.",
    hi: "शुगर कम है। अपने डॉक्टर का बताया लो-शुगर प्लान अपनाएँ और थोड़ी देर में फिर से जाँचें।",
  },
  glucose_high: {
    en: "High reading. Contact your doctor today.",
    hi: "रीडिंग ज़्यादा है। आज ही अपने डॉक्टर से संपर्क करें।",
  },
  glucose_very_high: {
    en: "Very high reading. Call your doctor now. If vomiting, breathless or drowsy, call 108.",
    hi: "रीडिंग बहुत ज़्यादा है। अभी अपने डॉक्टर को कॉल करें। अगर उल्टी हो, साँस फूले या बहुत नींद आए, तो 108 पर कॉल करें।",
  },
  missed_doses: {
    en: "{name} missed {count} doses since yesterday.",
    hi: "{name} की कल से {count} खुराकें छूट गई हैं।",
  },
  no_logs: {
    en: "No updates from {name} in {days} days. Check in?",
    hi: "{days} दिन से {name} की कोई जानकारी नहीं आई। हालचाल पूछें?",
  },
  support_request: {
    en: "{name} asked for support. Please call them.",
    hi: "{name} ने सहारा माँगा है। कृपया उन्हें कॉल करें।",
  },
  mood_title: {
    en: "How has your energy been?",
    hi: "आपकी ऊर्जा कैसी रही?",
  },
  mood_intro: {
    en: "Two quick questions about the last 2 weeks. Only you see your answers.",
    hi: "पिछले 2 हफ़्तों के बारे में दो छोटे सवाल। आपके जवाब सिर्फ़ आप देखते हैं।",
  },
  mood_q1: {
    en: "How often have you had little interest or pleasure in doing things?",
    hi: "कितनी बार ऐसा हुआ कि किसी काम में मन नहीं लगा या मज़ा नहीं आया?",
  },
  mood_q2: {
    en: "How often have you felt down, low or hopeless?",
    hi: "कितनी बार आप उदास, निराश या मायूस महसूस करते रहे?",
  },
  mood_a0: { en: "Not at all", hi: "बिल्कुल नहीं" },
  mood_a1: { en: "Several days", hi: "कुछ दिन" },
  mood_a2: { en: "More than half the days", hi: "आधे से ज़्यादा दिन" },
  mood_a3: { en: "Nearly every day", hi: "लगभग हर दिन" },
  mood_follow_up: {
    en: "In the last 2 weeks, have you had thoughts that you would be better off dead, or of hurting yourself?",
    hi: "पिछले 2 हफ़्तों में, क्या आपके मन में ऐसे विचार आए कि मर जाना बेहतर होगा, या ख़ुद को नुक़सान पहुँचाने के विचार?",
  },
  mood_ok: {
    en: "Thank you. See you next week.",
    hi: "धन्यवाद। अगले हफ़्ते फिर मिलेंगे।",
  },
  mood_support: {
    en: "Thank you for answering honestly. Many people with diabetes feel this way, and talking to someone helps. Tele-MANAS is free, private and open 24 hours.",
    hi: "ईमानदारी से बताने के लिए धन्यवाद। डायबिटीज़ वाले बहुत से लोग ऐसा महसूस करते हैं, और किसी से बात करने से मदद मिलती है। टेली-मानस मुफ़्त है, गोपनीय है और 24 घंटे खुला है।",
  },
  mood_add_to_doctor: {
    en: "Add this to my doctor link?",
    hi: "क्या इसे डॉक्टर वाले लिंक में जोड़ें?",
  },
  crisis_title: {
    en: "You don't have to go through this alone.",
    hi: "आपको यह अकेले नहीं सहना है।",
  },
  crisis_body: {
    en: "Please talk to someone now. These calls are free.",
    hi: "कृपया अभी किसी से बात करें। ये कॉल मुफ़्त हैं।",
  },
  crisis_tell_family: {
    en: "Can we tell {name} you need support?",
    hi: "क्या हम {name} को बता दें कि आपको सहारे की ज़रूरत है?",
  },
  crisis_told: {
    en: "We told {name}. They will see it when they open Pulse.",
    hi: "हमने {name} को बता दिया है। Pulse खोलते ही उन्हें दिखेगा।",
  },
  help_title: { en: "Need help now", hi: "अभी मदद चाहिए" },
  help_body: {
    en: "If someone is in danger, call 112. For a medical emergency, call 108. To talk to a counsellor any time, call Tele-MANAS on 14416.",
    hi: "अगर किसी की जान को ख़तरा हो, तो 112 पर कॉल करें। मेडिकल इमरजेंसी के लिए 108 पर कॉल करें। किसी भी समय काउंसलर से बात करने के लिए टेली-मानस 14416 पर कॉल करें।",
  },
  insight_disclaimer: {
    en: "Talk to your doctor before changing medicines.",
    hi: "दवा बदलने से पहले अपने डॉक्टर से बात करें।",
  },
} satisfies Record<string, Copy>;

export type SafetyCopyKey = keyof typeof SAFETY_COPY;

export function safetyText(key: SafetyCopyKey, locale: Locale, vars?: TranslateVars): string {
  return interpolate(SAFETY_COPY[key][locale], vars);
}
