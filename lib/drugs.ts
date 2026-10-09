/**
 * A small, curated medicine reference for the interaction checker and generic
 * alternatives. It covers common Indian brands only and is not a complete
 * clinical database: the UI always says "Check with your doctor or pharmacist".
 * Prices are approximate MRP for 10 units (₹) and change by pharmacy.
 */

export type Generic =
  | "metformin"
  | "glimepiride"
  | "amlodipine"
  | "telmisartan"
  | "losartan"
  | "ramipril"
  | "metoprolol"
  | "spironolactone"
  | "atorvastatin"
  | "rosuvastatin"
  | "aspirin"
  | "clopidogrel"
  | "warfarin"
  | "levothyroxine"
  | "calcium"
  | "vitamin-d3"
  | "iron"
  | "ibuprofen"
  | "diclofenac"
  | "paracetamol"
  | "pantoprazole"
  | "omeprazole"
  | "salbutamol"
  | "montelukast"
  | "levocetirizine"
  | "cetirizine"
  | "azithromycin"
  | "ciprofloxacin";

export const GENERIC_LABEL: Record<Generic, string> = {
  metformin: "Metformin",
  glimepiride: "Glimepiride",
  amlodipine: "Amlodipine",
  telmisartan: "Telmisartan",
  losartan: "Losartan",
  ramipril: "Ramipril",
  metoprolol: "Metoprolol",
  spironolactone: "Spironolactone",
  atorvastatin: "Atorvastatin",
  rosuvastatin: "Rosuvastatin",
  aspirin: "Aspirin",
  clopidogrel: "Clopidogrel",
  warfarin: "Warfarin",
  levothyroxine: "Levothyroxine",
  calcium: "Calcium",
  "vitamin-d3": "Vitamin D3",
  iron: "Iron (ferrous)",
  ibuprofen: "Ibuprofen",
  diclofenac: "Diclofenac",
  paracetamol: "Paracetamol",
  pantoprazole: "Pantoprazole",
  omeprazole: "Omeprazole",
  salbutamol: "Salbutamol",
  montelukast: "Montelukast",
  levocetirizine: "Levocetirizine",
  cetirizine: "Cetirizine",
  azithromycin: "Azithromycin",
  ciprofloxacin: "Ciprofloxacin",
};

/** What the medicine is for, in plain words. */
export const GENERIC_USE: Record<Generic, string> = {
  metformin: "Blood sugar (diabetes)",
  glimepiride: "Blood sugar (diabetes)",
  amlodipine: "Blood pressure",
  telmisartan: "Blood pressure",
  losartan: "Blood pressure",
  ramipril: "Blood pressure, heart",
  metoprolol: "Blood pressure, heart rate",
  spironolactone: "Fluid, blood pressure",
  atorvastatin: "Cholesterol",
  rosuvastatin: "Cholesterol",
  aspirin: "Blood thinner (low dose), pain",
  clopidogrel: "Blood thinner",
  warfarin: "Blood thinner",
  levothyroxine: "Thyroid",
  calcium: "Bones (calcium supplement)",
  "vitamin-d3": "Vitamin D supplement",
  iron: "Iron supplement, anaemia",
  ibuprofen: "Pain, fever, swelling",
  diclofenac: "Pain, swelling",
  paracetamol: "Pain, fever",
  pantoprazole: "Acidity",
  omeprazole: "Acidity",
  salbutamol: "Asthma reliever inhaler",
  montelukast: "Asthma, allergy prevention",
  levocetirizine: "Allergy",
  cetirizine: "Allergy",
  azithromycin: "Antibiotic",
  ciprofloxacin: "Antibiotic",
};

export type DrugEntry = {
  brand: string;
  generics: Generic[];
  strength: string;
  /** Approximate MRP for 10 units, ₹ */
  brandPrice: number;
  /** Approximate Jan Aushadhi / generic price for 10 units, ₹ */
  genericPrice: number;
};

export const DRUGS: DrugEntry[] = [
  { brand: "Glycomet", generics: ["metformin"], strength: "500 mg", brandPrice: 22, genericPrice: 9 },
  { brand: "Glucophage", generics: ["metformin"], strength: "500 mg", brandPrice: 25, genericPrice: 9 },
  { brand: "Amaryl", generics: ["glimepiride"], strength: "1 mg", brandPrice: 120, genericPrice: 18 },
  { brand: "Amlong", generics: ["amlodipine"], strength: "5 mg", brandPrice: 46, genericPrice: 6 },
  { brand: "Stamlo", generics: ["amlodipine"], strength: "5 mg", brandPrice: 52, genericPrice: 6 },
  { brand: "Telma", generics: ["telmisartan"], strength: "40 mg", brandPrice: 110, genericPrice: 14 },
  { brand: "Telma-AM", generics: ["telmisartan", "amlodipine"], strength: "40/5 mg", brandPrice: 130, genericPrice: 20 },
  { brand: "Losar", generics: ["losartan"], strength: "50 mg", brandPrice: 70, genericPrice: 10 },
  { brand: "Cardace", generics: ["ramipril"], strength: "5 mg", brandPrice: 120, genericPrice: 15 },
  { brand: "Metolar", generics: ["metoprolol"], strength: "25 mg", brandPrice: 40, genericPrice: 8 },
  { brand: "Aldactone", generics: ["spironolactone"], strength: "25 mg", brandPrice: 35, genericPrice: 9 },
  { brand: "Atorva", generics: ["atorvastatin"], strength: "10 mg", brandPrice: 98, genericPrice: 11 },
  { brand: "Storvas", generics: ["atorvastatin"], strength: "10 mg", brandPrice: 105, genericPrice: 11 },
  { brand: "Rosuvas", generics: ["rosuvastatin"], strength: "10 mg", brandPrice: 210, genericPrice: 18 },
  { brand: "Ecosprin", generics: ["aspirin"], strength: "75 mg", brandPrice: 6, genericPrice: 3 },
  { brand: "Disprin", generics: ["aspirin"], strength: "325 mg", brandPrice: 10, genericPrice: 4 },
  { brand: "Clopilet", generics: ["clopidogrel"], strength: "75 mg", brandPrice: 75, genericPrice: 12 },
  { brand: "Warf", generics: ["warfarin"], strength: "5 mg", brandPrice: 40, genericPrice: 15 },
  { brand: "Thyronorm", generics: ["levothyroxine"], strength: "50 mcg", brandPrice: 19, genericPrice: 8 },
  { brand: "Eltroxin", generics: ["levothyroxine"], strength: "50 mcg", brandPrice: 22, genericPrice: 8 },
  { brand: "Shelcal", generics: ["calcium", "vitamin-d3"], strength: "500 mg", brandPrice: 120, genericPrice: 25 },
  { brand: "Calcimax", generics: ["calcium", "vitamin-d3"], strength: "500 mg", brandPrice: 140, genericPrice: 25 },
  { brand: "Uprise-D3", generics: ["vitamin-d3"], strength: "60000 IU", brandPrice: 120, genericPrice: 30 },
  { brand: "Livogen", generics: ["iron"], strength: "152 mg", brandPrice: 70, genericPrice: 12 },
  { brand: "Brufen", generics: ["ibuprofen"], strength: "400 mg", brandPrice: 16, genericPrice: 5 },
  { brand: "Combiflam", generics: ["ibuprofen", "paracetamol"], strength: "400/325 mg", brandPrice: 45, genericPrice: 8 },
  { brand: "Voveran", generics: ["diclofenac"], strength: "50 mg", brandPrice: 32, genericPrice: 5 },
  { brand: "Dolo", generics: ["paracetamol"], strength: "650 mg", brandPrice: 32, genericPrice: 10 },
  { brand: "Crocin", generics: ["paracetamol"], strength: "500 mg", brandPrice: 22, genericPrice: 8 },
  { brand: "Calpol", generics: ["paracetamol"], strength: "500 mg", brandPrice: 15, genericPrice: 8 },
  { brand: "Pan", generics: ["pantoprazole"], strength: "40 mg", brandPrice: 150, genericPrice: 12 },
  { brand: "Pantocid", generics: ["pantoprazole"], strength: "40 mg", brandPrice: 160, genericPrice: 12 },
  { brand: "Omez", generics: ["omeprazole"], strength: "20 mg", brandPrice: 60, genericPrice: 8 },
  { brand: "Asthalin", generics: ["salbutamol"], strength: "100 mcg inhaler", brandPrice: 150, genericPrice: 75 },
  { brand: "Montair", generics: ["montelukast"], strength: "10 mg", brandPrice: 230, genericPrice: 25 },
  { brand: "Montek LC", generics: ["montelukast", "levocetirizine"], strength: "10/5 mg", brandPrice: 200, genericPrice: 25 },
  { brand: "Cetzine", generics: ["cetirizine"], strength: "10 mg", brandPrice: 20, genericPrice: 4 },
  { brand: "Okacet", generics: ["cetirizine"], strength: "10 mg", brandPrice: 18, genericPrice: 4 },
  { brand: "Azithral", generics: ["azithromycin"], strength: "500 mg", brandPrice: 120, genericPrice: 35 },
  { brand: "Ciplox", generics: ["ciprofloxacin"], strength: "500 mg", brandPrice: 70, genericPrice: 15 },
];

export type InteractionSeverity = "major" | "moderate" | "minor";

export type Interaction = {
  a: Generic;
  b: Generic;
  severity: InteractionSeverity;
  effect: string;
  advice: string;
};

export const INTERACTIONS: Interaction[] = [
  { a: "aspirin", b: "ibuprofen", severity: "major", effect: "Together they raise the risk of stomach bleeding, and ibuprofen can weaken aspirin's heart protection.", advice: "Avoid taking ibuprofen with daily aspirin unless a doctor says so. Paracetamol is usually a safer pain option." },
  { a: "aspirin", b: "diclofenac", severity: "major", effect: "Higher risk of stomach bleeding and ulcers.", advice: "Ask the doctor before using diclofenac for pain." },
  { a: "aspirin", b: "clopidogrel", severity: "moderate", effect: "Both thin the blood, so bleeding risk is higher. Doctors often prescribe them together on purpose.", advice: "Take only as prescribed, and report black stools or unusual bruising." },
  { a: "aspirin", b: "warfarin", severity: "major", effect: "Much higher risk of serious bleeding.", advice: "Only take together if your doctor has prescribed both and checks your INR." },
  { a: "warfarin", b: "ibuprofen", severity: "major", effect: "Higher risk of serious bleeding.", advice: "Avoid. Ask the doctor for a safer pain option." },
  { a: "warfarin", b: "diclofenac", severity: "major", effect: "Higher risk of serious bleeding.", advice: "Avoid. Ask the doctor for a safer pain option." },
  { a: "warfarin", b: "azithromycin", severity: "moderate", effect: "Can make warfarin stronger and raise bleeding risk.", advice: "Tell the doctor you take warfarin; an INR check may be needed." },
  { a: "warfarin", b: "ciprofloxacin", severity: "major", effect: "Can make warfarin much stronger.", advice: "Tell the doctor you take warfarin; an INR check is usually needed." },
  { a: "warfarin", b: "paracetamol", severity: "minor", effect: "Regular high doses of paracetamol can make warfarin slightly stronger.", advice: "Occasional use is usually fine; mention regular use to your doctor." },
  { a: "levothyroxine", b: "calcium", severity: "moderate", effect: "Calcium stops the thyroid tablet from being absorbed properly.", advice: "Take the thyroid tablet on an empty stomach and calcium at least 4 hours later." },
  { a: "levothyroxine", b: "iron", severity: "moderate", effect: "Iron stops the thyroid tablet from being absorbed properly.", advice: "Keep them at least 4 hours apart." },
  { a: "levothyroxine", b: "pantoprazole", severity: "minor", effect: "Acidity tablets can slightly reduce thyroid tablet absorption.", advice: "Your doctor may check thyroid levels after starting." },
  { a: "levothyroxine", b: "omeprazole", severity: "minor", effect: "Acidity tablets can slightly reduce thyroid tablet absorption.", advice: "Your doctor may check thyroid levels after starting." },
  { a: "ciprofloxacin", b: "calcium", severity: "moderate", effect: "Calcium blocks the antibiotic from being absorbed.", advice: "Take ciprofloxacin 2 hours before or 6 hours after calcium." },
  { a: "ciprofloxacin", b: "iron", severity: "moderate", effect: "Iron blocks the antibiotic from being absorbed.", advice: "Take ciprofloxacin 2 hours before or 6 hours after iron." },
  { a: "ciprofloxacin", b: "glimepiride", severity: "moderate", effect: "Can cause unexpected low blood sugar.", advice: "Check sugar more often while on the antibiotic." },
  { a: "clopidogrel", b: "omeprazole", severity: "moderate", effect: "Omeprazole can make clopidogrel work less well.", advice: "Ask the doctor whether pantoprazole would suit you instead." },
  { a: "telmisartan", b: "spironolactone", severity: "major", effect: "Can raise potassium to unsafe levels.", advice: "Needs regular blood tests; only take together if prescribed." },
  { a: "losartan", b: "spironolactone", severity: "major", effect: "Can raise potassium to unsafe levels.", advice: "Needs regular blood tests; only take together if prescribed." },
  { a: "ramipril", b: "spironolactone", severity: "major", effect: "Can raise potassium to unsafe levels.", advice: "Needs regular blood tests; only take together if prescribed." },
  { a: "telmisartan", b: "ibuprofen", severity: "moderate", effect: "Pain killers like ibuprofen can raise blood pressure and strain the kidneys.", advice: "Prefer paracetamol for pain; ask the doctor before regular use." },
  { a: "telmisartan", b: "diclofenac", severity: "moderate", effect: "Pain killers like diclofenac can raise blood pressure and strain the kidneys.", advice: "Prefer paracetamol for pain; ask the doctor before regular use." },
  { a: "losartan", b: "ibuprofen", severity: "moderate", effect: "Pain killers like ibuprofen can raise blood pressure and strain the kidneys.", advice: "Prefer paracetamol for pain; ask the doctor before regular use." },
  { a: "ramipril", b: "ibuprofen", severity: "moderate", effect: "Pain killers like ibuprofen can raise blood pressure and strain the kidneys.", advice: "Prefer paracetamol for pain; ask the doctor before regular use." },
  { a: "metoprolol", b: "salbutamol", severity: "minor", effect: "Metoprolol can slightly reduce how well the inhaler works.", advice: "Usually fine; tell the doctor if breathing gets worse." },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Finds the generics in a medicine, by brand or generic name ("Glycomet 500", "metformin"). */
export function lookupGenerics(name: string, genericName?: string | null): Generic[] {
  const out = new Set<Generic>();
  for (const candidate of [name, genericName ?? ""]) {
    const n = norm(candidate);
    if (!n) continue;
    for (const [key, label] of Object.entries(GENERIC_LABEL) as [Generic, string][]) {
      if (n.includes(norm(label)) || n.split(" ").includes(key)) out.add(key);
    }
    const brand = findBrand(candidate);
    brand?.generics.forEach((g) => out.add(g));
  }
  return [...out];
}

export function findBrand(name: string): DrugEntry | undefined {
  const n = norm(name);
  if (!n) return undefined;
  // Longest brand first so "Telma-AM" wins over "Telma"
  const sorted = [...DRUGS].sort((a, b) => b.brand.length - a.brand.length);
  return sorted.find((d) => {
    const b = norm(d.brand);
    return n === b || n.startsWith(`${b} `);
  });
}

export type MedicineRef = { id: string; name: string; genericName?: string | null; memberId?: string };

export type InteractionHit = Interaction & {
  first: MedicineRef;
  second: MedicineRef;
};

export type DuplicateHit = { generic: Generic; medicines: MedicineRef[] };

/** All interactions and same-ingredient duplicates within one person's medicine list. */
export function checkInteractions(meds: MedicineRef[]): { interactions: InteractionHit[]; duplicates: DuplicateHit[] } {
  const withGenerics = meds.map((m) => ({ med: m, generics: lookupGenerics(m.name, m.genericName) }));
  const interactions: InteractionHit[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < withGenerics.length; i++) {
    for (let j = i + 1; j < withGenerics.length; j++) {
      for (const ga of withGenerics[i].generics) {
        for (const gb of withGenerics[j].generics) {
          const hit = INTERACTIONS.find((x) => (x.a === ga && x.b === gb) || (x.a === gb && x.b === ga));
          if (!hit) continue;
          const key = `${withGenerics[i].med.id}|${withGenerics[j].med.id}|${hit.a}|${hit.b}`;
          if (seen.has(key)) continue;
          seen.add(key);
          interactions.push({ ...hit, first: withGenerics[i].med, second: withGenerics[j].med });
        }
      }
    }
  }
  const byGeneric = new Map<Generic, MedicineRef[]>();
  for (const { med, generics } of withGenerics) {
    for (const g of generics) byGeneric.set(g, [...(byGeneric.get(g) ?? []), med]);
  }
  const duplicates = [...byGeneric.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([generic, medicines]) => ({ generic, medicines }));
  const rank: Record<InteractionSeverity, number> = { major: 0, moderate: 1, minor: 2 };
  interactions.sort((x, y) => rank[x.severity] - rank[y.severity]);
  return { interactions, duplicates };
}

export type GenericAlternative = {
  brand: DrugEntry;
  genericName: string;
  genericPrice: number;
  savingPercent: number;
  monthlySaving: number;
};

/** The generic version of a branded medicine and what it saves per month. */
export function genericAlternative(name: string, dosesPerDay = 1): GenericAlternative | null {
  const brand = findBrand(name);
  if (!brand) return null;
  const savingPerUnit = (brand.brandPrice - brand.genericPrice) / 10;
  if (savingPerUnit <= 0) return null;
  return {
    brand,
    genericName: brand.generics.map((g) => GENERIC_LABEL[g]).join(" + "),
    genericPrice: brand.genericPrice,
    savingPercent: Math.round((1 - brand.genericPrice / brand.brandPrice) * 100),
    monthlySaving: Math.round(savingPerUnit * dosesPerDay * 30),
  };
}

/** Suggestions for the medicine name field. */
export function searchDrugs(query: string, limit = 6): DrugEntry[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return DRUGS.filter(
    (d) => norm(d.brand).startsWith(q) || d.generics.some((g) => norm(GENERIC_LABEL[g]).startsWith(q))
  ).slice(0, limit);
}
