// SYNTHETIC demo data for what the database does not store yet: blood group,
// allergies, conditions, emergency contacts, blood pressure and weight, report
// files, clinic appointments and refills. It only ever attaches to patients
// marked `synthetic` (the seeded Sharma family), matched by name, so a real
// profile never shows invented health facts.
//
// Each row type mirrors the table it will become (see the comment above it),
// so swapping this file for Drizzle queries later is a change of source, not shape.
// Dates are stored as offsets from today and resolved by `demoProfile()`.

import { addDays } from "@/lib/dates";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type AllergySeverity = "mild" | "severe";

/** Future table `health_profiles` (one row per patient). */
export type HealthProfileRow = {
  bloodGroup: BloodGroup;
  sex: "male" | "female";
  heightCm: number;
  conditions: { name: string; since?: string }[];
  allergies: { name: string; reaction: string; severity: AllergySeverity }[];
  /** One line a paramedic should read first. */
  emergencyNote?: string;
  organDonor?: boolean;
};

/** Future table `emergency_contacts`. */
export type EmergencyContactRow = { name: string; relation: string; phone: string; priority: number };

/** Future table `vital_readings` (glucose already lives in `glucose_readings`). */
export type VitalRow =
  | { kind: "bp"; systolic: number; diastolic: number; measuredOn: string }
  | { kind: "weight"; kg: number; measuredOn: string };

export type RecordKind = "lab" | "prescription" | "imaging" | "discharge" | "vaccination";

/** Future table `health_records` (files in object storage). */
export type HealthRecordRow = {
  id: string;
  kind: RecordKind;
  title: string;
  issuer: string;
  takenOn: string;
  fileType: "pdf" | "jpg";
  pages: number;
  sizeKb: number;
  /** Plain-language one-liner shown under the title. */
  summary: string;
};

/** Future table `appointments` (in-person visits; video calls are `call_bookings`). */
export type AppointmentRow = {
  id: string;
  kind: "clinic" | "lab" | "vaccination";
  title: string;
  doctorName: string;
  speciality: string;
  place: string;
  address: string;
  startsOn: string;
  time: string; // "HH:MM" India time
  durationMin: number;
  notes?: string;
};

/** Future columns on `medications`: pills on hand and per-day use. */
export type RefillRow = { medicineName: string; pillsLeft: number; perDay: number };

type Seed = {
  profile: HealthProfileRow;
  contacts: EmergencyContactRow[];
  bp: [daysAgo: number, systolic: number, diastolic: number][];
  weight: [daysAgo: number, kg: number][];
  records: (Omit<HealthRecordRow, "takenOn"> & { daysAgo: number })[];
  appointments: (Omit<AppointmentRow, "startsOn"> & { inDays: number })[];
  refills: RefillRow[];
};

const RAHUL = { name: "Rahul Sharma", relation: "Son", phone: "9800000002" };
const SUNITA = { name: "Sunita Sharma", relation: "Wife", phone: "9800000003" };
const DOCTOR = { name: "Dr. Anjali Verma", relation: "Family doctor", phone: "9800000004" };

const FAMILY: Record<string, Seed> = {
  "Ramesh Sharma": {
    profile: {
      bloodGroup: "B+",
      sex: "male",
      heightCm: 168,
      conditions: [{ name: "Type 2 diabetes", since: "2016" }, { name: "High cholesterol", since: "2019" }, { name: "High blood pressure", since: "2021" }],
      allergies: [{ name: "Sulfa medicines", reaction: "Rash and face swelling", severity: "severe" }],
      emergencyNote: "Diabetic on Glimepiride: if confused or sweaty, check sugar first.",
      organDonor: true,
    },
    contacts: [
      { ...RAHUL, priority: 1 },
      { ...SUNITA, priority: 2 },
      { ...DOCTOR, priority: 3 },
    ],
    bp: [
      [56, 134, 86], [49, 138, 88], [42, 136, 87], [35, 141, 90], [28, 139, 89],
      [21, 144, 91], [14, 142, 90], [9, 146, 93], [5, 148, 94], [2, 150, 95], [0, 150, 95],
    ],
    weight: [[150, 79.2], [120, 78.6], [90, 78.1], [60, 77.4], [30, 76.9], [3, 76.5]],
    records: [
      { id: "r-rs-1", kind: "lab", title: "HbA1c test", issuer: "City Diagnostics, Kanpur", daysAgo: 6, fileType: "pdf", pages: 1, sizeKb: 182, summary: "HbA1c 7.6%, down from 8.4% in July" },
      { id: "r-rs-2", kind: "prescription", title: "Prescription", issuer: "Dr. Anjali Verma", daysAgo: 20, fileType: "jpg", pages: 1, sizeKb: 640, summary: "Metformin 500 mg twice a day, Glimepiride 1 mg morning" },
      { id: "r-rs-3", kind: "lab", title: "Lipid profile", issuer: "City Diagnostics, Kanpur", daysAgo: 41, fileType: "pdf", pages: 2, sizeKb: 233, summary: "LDL 118 mg/dL, triglycerides 172 mg/dL" },
      { id: "r-rs-4", kind: "imaging", title: "ECG", issuer: "Regency Heart Centre, Kanpur", daysAgo: 118, fileType: "pdf", pages: 1, sizeKb: 410, summary: "Normal rhythm, no changes since last year" },
      { id: "r-rs-5", kind: "lab", title: "Retina (eye) check", issuer: "Kanpur Eye Centre", daysAgo: 203, fileType: "jpg", pages: 2, sizeKb: 1120, summary: "No diabetic eye damage found" },
    ],
    appointments: [
      { id: "a-rs-1", kind: "clinic", title: "Diabetes review", doctorName: "Dr. Anjali Verma", speciality: "Family physician", place: "Verma Clinic", address: "117/H-1 Pandu Nagar, Kanpur", inDays: 3, time: "10:30", durationMin: 20, notes: "Bring the glucometer and this week's BP readings. Ask about the evening Metformin." },
      { id: "a-rs-2", kind: "lab", title: "Fasting blood test", doctorName: "City Diagnostics", speciality: "Lab", place: "City Diagnostics", address: "Mall Road, Kanpur", inDays: 2, time: "08:00", durationMin: 15, notes: "Nothing to eat after 10 pm the night before. Water is fine." },
      { id: "a-rs-3", kind: "clinic", title: "Eye check", doctorName: "Dr. Sanjay Mehta", speciality: "Eye specialist", place: "Kanpur Eye Centre", address: "Civil Lines, Kanpur", inDays: 18, time: "16:00", durationMin: 30 },
      { id: "a-rs-4", kind: "clinic", title: "Diabetes review", doctorName: "Dr. Anjali Verma", speciality: "Family physician", place: "Verma Clinic", address: "117/H-1 Pandu Nagar, Kanpur", inDays: -27, time: "11:00", durationMin: 20, notes: "Dose unchanged. Walk 30 minutes after dinner." },
    ],
    refills: [
      { medicineName: "Metformin", pillsLeft: 9, perDay: 2 },
      { medicineName: "Glimepiride", pillsLeft: 24, perDay: 1 },
      { medicineName: "Atorvastatin", pillsLeft: 3, perDay: 1 },
    ],
  },
  "Sunita Sharma": {
    profile: {
      bloodGroup: "O+",
      sex: "female",
      heightCm: 156,
      conditions: [{ name: "High blood pressure", since: "2018" }, { name: "Underactive thyroid", since: "2015" }],
      allergies: [{ name: "Penicillin", reaction: "Hives and breathing trouble", severity: "severe" }],
      emergencyNote: "Takes Thyroxine before breakfast every day.",
    },
    contacts: [
      { ...RAHUL, priority: 1 },
      { name: "Ramesh Sharma", relation: "Husband", phone: "9800000001", priority: 2 },
    ],
    bp: [
      [56, 132, 84], [49, 130, 83], [42, 128, 82], [35, 129, 82], [28, 126, 80],
      [21, 127, 81], [14, 125, 80], [7, 124, 79], [1, 126, 80],
    ],
    weight: [[150, 64.8], [90, 64.1], [30, 63.6], [2, 63.4]],
    records: [
      { id: "r-ss-1", kind: "lab", title: "Thyroid test (TSH)", issuer: "City Diagnostics, Kanpur", daysAgo: 29, fileType: "pdf", pages: 1, sizeKb: 150, summary: "TSH 3.1, inside the usual range" },
      { id: "r-ss-2", kind: "prescription", title: "Prescription", issuer: "Dr. Radha Iyer", daysAgo: 31, fileType: "jpg", pages: 1, sizeKb: 580, summary: "Thyroxine 50 mcg, Amlodipine 5 mg" },
      { id: "r-ss-3", kind: "imaging", title: "Bone density scan", issuer: "Regency Hospital, Kanpur", daysAgo: 160, fileType: "pdf", pages: 3, sizeKb: 890, summary: "Mild bone thinning; calcium advised" },
    ],
    appointments: [
      { id: "a-ss-1", kind: "clinic", title: "Thyroid follow-up", doctorName: "Dr. Radha Iyer", speciality: "Hormone specialist", place: "Iyer Endocrine Clinic", address: "Swaroop Nagar, Kanpur", inDays: 9, time: "11:15", durationMin: 20, notes: "Take the morning tablet as usual before the visit." },
    ],
    refills: [
      { medicineName: "Thyroxine", pillsLeft: 41, perDay: 1 },
      { medicineName: "Amlodipine", pillsLeft: 6, perDay: 1 },
      { medicineName: "Calcium + Vitamin D3", pillsLeft: 52, perDay: 1 },
    ],
  },
  "Rahul Sharma": {
    profile: {
      bloodGroup: "A+",
      sex: "male",
      heightCm: 176,
      conditions: [],
      allergies: [{ name: "House dust", reaction: "Sneezing", severity: "mild" }],
    },
    contacts: [{ name: "Priya Sharma", relation: "Wife", phone: "9800000005", priority: 1 }],
    bp: [[40, 122, 78], [12, 118, 76]],
    weight: [[90, 81.5], [40, 80.8], [12, 80.2]],
    records: [
      { id: "r-rh-1", kind: "lab", title: "Full body check-up", issuer: "Pune Wellness Labs", daysAgo: 64, fileType: "pdf", pages: 6, sizeKb: 1340, summary: "Vitamin D low, everything else in range" },
    ],
    appointments: [],
    refills: [],
  },
  "Priya Sharma": {
    profile: {
      bloodGroup: "B+",
      sex: "female",
      heightCm: 162,
      conditions: [{ name: "Low iron (anaemia)", since: "2025" }],
      allergies: [],
    },
    contacts: [{ ...RAHUL, relation: "Husband", priority: 1 }],
    bp: [[30, 112, 72], [4, 110, 70]],
    weight: [[60, 57.2], [4, 57.9]],
    records: [
      { id: "r-ps-1", kind: "lab", title: "Blood count (CBC)", issuer: "Pune Wellness Labs", daysAgo: 45, fileType: "pdf", pages: 2, sizeKb: 210, summary: "Haemoglobin 10.4, iron tablets started" },
    ],
    appointments: [
      { id: "a-ps-1", kind: "lab", title: "Haemoglobin re-test", doctorName: "Pune Wellness Labs", speciality: "Lab", place: "Pune Wellness Labs", address: "Baner Road, Pune", inDays: 12, time: "09:00", durationMin: 15 },
    ],
    refills: [{ medicineName: "Ferrous ascorbate", pillsLeft: 18, perDay: 1 }],
  },
  "Aarav Sharma": {
    profile: {
      bloodGroup: "O+",
      sex: "male",
      heightCm: 122,
      conditions: [{ name: "Mild asthma", since: "2023" }],
      allergies: [{ name: "Peanuts", reaction: "Swelling, trouble breathing. Has an EpiPen in his school bag.", severity: "severe" }],
      emergencyNote: "Severe peanut allergy. EpiPen is in the front pocket of his school bag.",
    },
    contacts: [
      { ...RAHUL, relation: "Father", priority: 1 },
      { name: "Priya Sharma", relation: "Mother", phone: "9800000005", priority: 2 },
    ],
    bp: [],
    weight: [[180, 22.1], [90, 23.0], [10, 23.6]],
    records: [
      { id: "r-as-1", kind: "vaccination", title: "Vaccination card", issuer: "Little Steps Child Clinic", daysAgo: 92, fileType: "jpg", pages: 2, sizeKb: 960, summary: "Up to date until the DTaP booster" },
      { id: "r-as-2", kind: "prescription", title: "Asthma plan", issuer: "Dr. Kavita Rao", daysAgo: 140, fileType: "pdf", pages: 1, sizeKb: 120, summary: "Montelukast at night; inhaler only when wheezing" },
    ],
    appointments: [
      { id: "a-as-1", kind: "vaccination", title: "DTaP booster", doctorName: "Dr. Kavita Rao", speciality: "Child specialist", place: "Little Steps Child Clinic", address: "Aundh, Pune", inDays: 1, time: "17:30", durationMin: 15, notes: "Bring the vaccination card. Mild fever for a day is common afterwards." },
    ],
    refills: [{ medicineName: "Montelukast", pillsLeft: 22, perDay: 1 }],
  },
};

export type DemoProfile = {
  profile: HealthProfileRow;
  contacts: EmergencyContactRow[];
  vitals: VitalRow[];
  records: HealthRecordRow[];
  appointments: AppointmentRow[];
  refills: RefillRow[];
};

/** The synthetic extras for a seeded patient, with dates resolved against `today`. Null for real profiles. */
export function demoProfile(patient: { name: string; synthetic: boolean }, today: string): DemoProfile | null {
  if (!patient.synthetic) return null;
  const seed = FAMILY[patient.name];
  if (!seed) return null;
  return {
    profile: seed.profile,
    contacts: [...seed.contacts].sort((a, b) => a.priority - b.priority),
    vitals: [
      ...seed.bp.map(([d, systolic, diastolic]) => ({ kind: "bp" as const, systolic, diastolic, measuredOn: addDays(today, -d) })),
      ...seed.weight.map(([d, kg]) => ({ kind: "weight" as const, kg, measuredOn: addDays(today, -d) })),
    ],
    records: seed.records
      .map(({ daysAgo, ...r }) => ({ ...r, takenOn: addDays(today, -daysAgo) }))
      .sort((a, b) => b.takenOn.localeCompare(a.takenOn)),
    appointments: seed.appointments
      .map(({ inDays, ...a }) => ({ ...a, startsOn: addDays(today, inDays) }))
      .sort((a, b) => `${a.startsOn}${a.time}`.localeCompare(`${b.startsOn}${b.time}`)),
    refills: seed.refills,
  };
}

/** Medicines the demo seed gives the rest of the family (Ramesh's live in db/seed-utils.ts). */
export const DEMO_FAMILY_MEDICINES: Record<string, { name: string; dose: string; times: string[] }[]> = {
  "Sunita Sharma": [
    { name: "Thyroxine", dose: "50 mcg", times: ["07:00"] },
    { name: "Amlodipine", dose: "5 mg", times: ["08:00"] },
    { name: "Calcium + Vitamin D3", dose: "500 mg", times: ["14:00"] },
  ],
  "Priya Sharma": [{ name: "Ferrous ascorbate", dose: "100 mg", times: ["14:00"] }],
  "Aarav Sharma": [{ name: "Montelukast", dose: "4 mg chewable", times: ["20:00"] }],
  "Rahul Sharma": [],
};

/** Birth years and cities for the extra family profiles the demo seed creates. */
export const DEMO_FAMILY_PROFILES = [
  { name: "Sunita Sharma", birthYear: 1968, city: "Kanpur", condition: "hypertension" },
  { name: "Rahul Sharma", birthYear: 1992, city: "Pune", condition: "general" },
  { name: "Priya Sharma", birthYear: 1995, city: "Pune", condition: "general" },
  { name: "Aarav Sharma", birthYear: 2019, city: "Pune", condition: "asthma" },
] as const;
