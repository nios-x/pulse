/** Languages for voice input/output and AI replies. Codes are BCP-47 for the Web Speech API. */
export const LANGUAGES = [
  { code: "en-IN", short: "en", label: "English", native: "English" },
  { code: "hi-IN", short: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "mr-IN", short: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn-IN", short: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta-IN", short: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", short: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn-IN", short: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "gu-IN", short: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "ml-IN", short: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa-IN", short: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code || l.short === code)?.label ?? "English";
}
