/**
 * Demo data for one believable family, typed against the Drizzle schema so the
 * same rows go straight into PostgreSQL (db/seed.ts) and could later be replaced
 * by real data without changing any screen.
 *
 * All people, numbers and documents here are synthetic.
 * Dates are built relative to "today" so the demo always looks current.
 */
import type {
  appointments,
  doctors,
  doseLogs,
  families,
  medications,
  members,
  notifications,
  records,
  shareLinks,
  triageSessions,
  users,
  vitals,
} from "@/db/schema";
import { addDays, fromIst, istDate, istTime, minutesOf } from "@/lib/dates";

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

export const DEMO_PASSWORD = "demo1234";

/** Fixed ids so rows can reference each other and tests can find them. */
export const ID = {
  family: "a0000000-0000-4000-8000-000000000001",
  users: {
    rahul: "b0000000-0000-4000-8000-000000000001",
    priya: "b0000000-0000-4000-8000-000000000002",
    suresh: "b0000000-0000-4000-8000-000000000003",
    kamala: "b0000000-0000-4000-8000-000000000004",
  },
  members: {
    rahul: "c0000000-0000-4000-8000-000000000001",
    priya: "c0000000-0000-4000-8000-000000000002",
    suresh: "c0000000-0000-4000-8000-000000000003",
    kamala: "c0000000-0000-4000-8000-000000000004",
    aarav: "c0000000-0000-4000-8000-000000000005",
  },
} as const;

export const DEMO_ACCOUNTS = [
  { email: "rahul@pulse.demo", name: "Rahul Mehta", role: "admin", note: "Runs the family's health" },
  { email: "priya@pulse.demo", name: "Priya Mehta", role: "caregiver", note: "Looks after Papa, Maa and Aarav" },
  { email: "suresh@pulse.demo", name: "Suresh Mehta", role: "member", note: "Sees only his own profile" },
  { email: "kamala@pulse.demo", name: "Kamala Mehta", role: "viewer", note: "Read-only" },
] as const;

/** Small deterministic random generator so every seed looks the same. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MockData = {
  users: (Omit<Insert<typeof users>, "passwordHash"> & { id: string })[];
  family: Insert<typeof families>;
  members: Insert<typeof members>[];
  medications: Insert<typeof medications>[];
  doseLogs: Insert<typeof doseLogs>[];
  vitals: Insert<typeof vitals>[];
  doctors: Insert<typeof doctors>[];
  appointments: Insert<typeof appointments>[];
  records: (Omit<Insert<typeof records>, "fileData"> & { file?: { svg: string } })[];
  shareLinks: Insert<typeof shareLinks>[];
  triageSessions: Insert<typeof triageSessions>[];
  notifications: Insert<typeof notifications>[];
};

export function buildMockData(now: Date = new Date()): MockData {
  const today = istDate(now);
  const nowTime = istTime(now);
  const d = (offset: number) => addDays(today, offset);
  // Never create data in the future: "today" items are clamped to a few minutes ago.
  const at = (offset: number, time: string) => {
    const t = fromIst(d(offset), time);
    return t.getTime() > now.getTime() - 10 * 60_000 && offset <= 0 ? new Date(now.getTime() - 10 * 60_000) : t;
  };
  const M = ID.members;
  const U = ID.users;

  const usersRows: MockData["users"] = [
    { id: U.rahul, name: "Rahul Mehta", email: "rahul@pulse.demo", phone: "+91 98220 41736", consentAt: at(-120, "10:00") },
    { id: U.priya, name: "Priya Mehta", email: "priya@pulse.demo", phone: "+91 98903 22814", consentAt: at(-118, "19:00") },
    { id: U.suresh, name: "Suresh Mehta", email: "suresh@pulse.demo", phone: "+91 94221 60593", consentAt: at(-110, "11:00") },
    { id: U.kamala, name: "Kamala Mehta", email: "kamala@pulse.demo", phone: "+91 94224 78120", consentAt: at(-110, "11:30") },
  ];

  const family: MockData["family"] = {
    id: ID.family,
    name: "Mehta family",
    city: "Pune",
    permissions: {},
    createdBy: U.rahul,
  };

  const contactsFor = (exclude: string) =>
    [
      { name: "Rahul Mehta", relation: "Son", phone: "+91 98220 41736" },
      { name: "Priya Mehta", relation: "Daughter-in-law", phone: "+91 98903 22814" },
      { name: "Dr. Anjali Deshpande", relation: "Family doctor", phone: "+91 20 2546 1180" },
    ].filter((c) => c.name !== exclude);

  const membersRows: MockData["members"] = [
    {
      id: M.rahul,
      familyId: ID.family,
      userId: U.rahul,
      name: "Rahul Mehta",
      relation: "self",
      role: "admin",
      dateOfBirth: "1987-06-14",
      sex: "male",
      bloodGroup: "B+",
      heightCm: 176,
      phone: "+91 98220 41736",
      avatarTone: 1,
      allergies: [],
      conditions: [{ name: "Acidity (GERD)", since: "2021" }],
      emergencyContacts: [
        { name: "Priya Mehta", relation: "Wife", phone: "+91 98903 22814" },
        { name: "Suresh Mehta", relation: "Father", phone: "+91 94221 60593" },
      ],
      assignedMemberIds: [],
      createdAt: at(-120, "10:00"),
    },
    {
      id: M.priya,
      familyId: ID.family,
      userId: U.priya,
      name: "Priya Mehta",
      relation: "spouse",
      role: "caregiver",
      dateOfBirth: "1990-02-03",
      sex: "female",
      bloodGroup: "O+",
      heightCm: 162,
      phone: "+91 98903 22814",
      avatarTone: 4,
      allergies: [{ name: "Penicillin", severity: "moderate", reaction: "Skin rash" }],
      conditions: [{ name: "Hypothyroidism", since: "2019" }],
      emergencyContacts: [
        { name: "Rahul Mehta", relation: "Husband", phone: "+91 98220 41736" },
        { name: "Sunil Shah", relation: "Brother", phone: "+91 99230 11457" },
      ],
      assignedMemberIds: [M.suresh, M.kamala, M.aarav],
      createdAt: at(-119, "10:05"),
    },
    {
      id: M.suresh,
      familyId: ID.family,
      userId: U.suresh,
      name: "Suresh Mehta",
      relation: "parent",
      role: "member",
      dateOfBirth: "1957-11-21",
      sex: "male",
      bloodGroup: "B+",
      heightCm: 170,
      phone: "+91 94221 60593",
      avatarTone: 2,
      allergies: [{ name: "Sulfa medicines", severity: "severe", reaction: "Face and lip swelling" }],
      conditions: [
        { name: "Type 2 diabetes", since: "2012" },
        { name: "High blood pressure", since: "2016" },
        { name: "High cholesterol", since: "2019" },
      ],
      emergencyContacts: contactsFor(""),
      assignedMemberIds: [],
      notes: "Prefers Hindi. Uses reading glasses. Walks 30 minutes every morning.",
      createdAt: at(-119, "10:10"),
    },
    {
      id: M.kamala,
      familyId: ID.family,
      userId: U.kamala,
      name: "Kamala Mehta",
      relation: "parent",
      role: "viewer",
      dateOfBirth: "1961-04-09",
      sex: "female",
      bloodGroup: "A+",
      heightCm: 155,
      phone: "+91 94224 78120",
      avatarTone: 5,
      allergies: [],
      conditions: [
        { name: "Knee osteoarthritis", since: "2020" },
        { name: "Hypothyroidism", since: "2015" },
      ],
      emergencyContacts: contactsFor(""),
      assignedMemberIds: [],
      createdAt: at(-119, "10:12"),
    },
    {
      id: M.aarav,
      familyId: ID.family,
      userId: null,
      name: "Aarav Mehta",
      relation: "child",
      role: "member",
      dateOfBirth: "2017-08-30",
      sex: "male",
      bloodGroup: "O+",
      heightCm: 132,
      avatarTone: 3,
      allergies: [{ name: "Peanuts", severity: "severe", reaction: "Anaphylaxis: carries no EpiPen yet, ask doctor" }],
      conditions: [{ name: "Mild asthma", since: "2022" }],
      emergencyContacts: [
        { name: "Priya Mehta", relation: "Mother", phone: "+91 98903 22814" },
        { name: "Rahul Mehta", relation: "Father", phone: "+91 98220 41736" },
      ],
      assignedMemberIds: [],
      notes: "Class 4, Vibgyor School Baner. School nurse has the allergy plan.",
      createdAt: at(-119, "10:15"),
    },
  ];

  // ---------- Medicines ----------
  const med = (
    id: string,
    memberId: string,
    name: string,
    genericName: string,
    strength: string,
    times: string[],
    extra: Partial<Insert<typeof medications>> = {}
  ): Insert<typeof medications> => ({
    id,
    memberId,
    name,
    genericName,
    strength,
    form: "tablet",
    times,
    startDate: d(-90),
    refillAt: 7,
    active: true,
    createdBy: U.rahul,
    ...extra,
  });

  const medsRows: Insert<typeof medications>[] = [
    med("d0000000-0000-4000-8000-000000000001", M.suresh, "Glycomet", "Metformin", "500 mg", ["08:30", "20:30"], { instructions: "After food", pillsLeft: 46, prescribedBy: "Dr. Farah Khan" }),
    med("d0000000-0000-4000-8000-000000000002", M.suresh, "Telma", "Telmisartan", "40 mg", ["08:30"], { instructions: "After breakfast", pillsLeft: 5, prescribedBy: "Dr. Farah Khan" }),
    med("d0000000-0000-4000-8000-000000000003", M.suresh, "Atorva", "Atorvastatin", "10 mg", ["21:30"], { instructions: "At bedtime", pillsLeft: 24, prescribedBy: "Dr. Farah Khan" }),
    med("d0000000-0000-4000-8000-000000000004", M.suresh, "Ecosprin", "Aspirin", "75 mg", ["13:30"], { instructions: "After lunch", pillsLeft: 52, prescribedBy: "Dr. Vikram Rao" }),
    med("d0000000-0000-4000-8000-000000000005", M.suresh, "Brufen", "Ibuprofen", "400 mg", ["14:00"], { instructions: "For knee pain, after food", pillsLeft: 7, startDate: d(-3), endDate: d(4), prescribedBy: "Self (chemist)" }),
    med("d0000000-0000-4000-8000-000000000006", M.kamala, "Eltroxin", "Levothyroxine", "50 mcg", ["06:30"], { instructions: "Empty stomach, 30 min before tea", pillsLeft: 61, prescribedBy: "Dr. Farah Khan" }),
    med("d0000000-0000-4000-8000-000000000007", M.kamala, "Shelcal", "Calcium + Vitamin D3", "500 mg", ["13:00"], { instructions: "After lunch", pillsLeft: 18, prescribedBy: "Dr. Meenakshi Kulkarni" }),
    med("d0000000-0000-4000-8000-000000000008", M.priya, "Thyronorm", "Levothyroxine", "50 mcg", ["07:00"], { instructions: "Empty stomach", pillsLeft: 80, prescribedBy: "Dr. Farah Khan" }),
    med("d0000000-0000-4000-8000-000000000009", M.aarav, "Montair", "Montelukast", "4 mg", ["20:00"], { form: "chewable tablet", instructions: "Chew at night", pillsLeft: 12, prescribedBy: "Dr. Arjun Malhotra" }),
    med("d0000000-0000-4000-8000-000000000010", M.rahul, "Pan", "Pantoprazole", "40 mg", ["07:30"], { instructions: "30 min before breakfast", pillsLeft: 9, prescribedBy: "Dr. Anjali Deshpande" }),
  ];

  // Dose history: mostly taken, with a believable pattern of misses.
  const rand = rng(42);
  const takeRate: Record<string, number> = {
    [M.suresh]: 0.88,
    [M.kamala]: 0.96,
    [M.priya]: 0.93,
    [M.aarav]: 0.84,
    [M.rahul]: 0.78,
  };
  const loggerFor: Record<string, string> = {
    [M.suresh]: U.suresh,
    [M.kamala]: U.priya,
    [M.priya]: U.priya,
    [M.aarav]: U.priya,
    [M.rahul]: U.rahul,
  };
  const doseRows: Insert<typeof doseLogs>[] = [];
  for (const m of medsRows) {
    for (let offset = -30; offset <= 0; offset++) {
      const date = d(offset);
      if (date < m.startDate! || (m.endDate && date > m.endDate)) continue;
      for (const time of m.times!) {
        if (offset === 0) {
          // Today: only doses well in the past are ticked; leave Papa's morning Telma un-ticked
          if (minutesOf(time) > minutesOf(nowTime) - 45) continue;
          if (m.name === "Telma") continue;
        }
        // Yesterday night Papa missed his Glycomet: drives the "missed dose" alert
        const forcedMiss = offset === -1 && m.name === "Glycomet" && time === "20:30";
        const r = rand();
        const status = forcedMiss ? null : r < takeRate[m.memberId!] ? "taken" : r < takeRate[m.memberId!] + 0.03 ? "skipped" : null;
        if (!status) continue;
        const [h, mm] = time.split(":").map(Number);
        const lateBy = Math.floor(rand() * 35);
        const loggedAt = fromIst(date, `${String(h).padStart(2, "0")}:${String(Math.min(59, mm + lateBy)).padStart(2, "0")}`);
        doseRows.push({
          medicationId: m.id!,
          memberId: m.memberId!,
          date,
          time,
          status,
          loggedAt,
          loggedBy: loggerFor[m.memberId!],
        });
      }
    }
  }

  // ---------- Vitals ----------
  const raw = (offset: number, time: string) => fromIst(d(offset), time);
  const vitalRows: Insert<typeof vitals>[] = [];
  const vr = rng(7);
  const jitter = (n: number) => (vr() - 0.5) * 2 * n;
  for (let offset = -60; offset <= 0; offset++) {
    // Papa: BP most mornings, fasting sugar every other day, weight weekly
    if (offset % 7 !== 3 || offset > -2) {
      const drift = offset > -10 ? 6 : 0; // creeping up lately (Brufen + missed doses)
      const sys = Math.round(134 + drift + jitter(7));
      const dia = Math.round(84 + drift / 2 + jitter(4));
      vitalRows.push({ memberId: M.suresh, kind: "bp", value: offset === 0 ? 152 : sys, value2: offset === 0 ? 96 : dia, measuredAt: offset === 0 ? at(0, "07:40") : raw(offset, "07:40"), loggedBy: U.suresh });
    }
    if (offset % 2 === 0) {
      vitalRows.push({ memberId: M.suresh, kind: "sugar", value: Math.round(128 + jitter(16) + (offset > -10 ? 8 : 0)), context: "fasting", measuredAt: raw(offset, "07:30"), loggedBy: U.suresh });
    }
    if (offset % 5 === 0) {
      vitalRows.push({ memberId: M.suresh, kind: "sugar", value: Math.round(172 + jitter(24)), context: "after_meal", measuredAt: raw(offset, "15:00"), loggedBy: U.suresh });
    }
    if (offset % 7 === 0) {
      vitalRows.push({ memberId: M.suresh, kind: "weight", value: Math.round((78.4 + offset * 0.03 + jitter(0.3)) * 10) / 10, measuredAt: raw(offset, "07:20"), loggedBy: U.suresh });
      vitalRows.push({ memberId: M.kamala, kind: "weight", value: Math.round((61.2 + jitter(0.4)) * 10) / 10, measuredAt: raw(offset, "07:15"), loggedBy: U.priya });
      vitalRows.push({ memberId: M.rahul, kind: "weight", value: Math.round((82.6 + offset * 0.02 + jitter(0.4)) * 10) / 10, measuredAt: raw(offset, "08:00"), loggedBy: U.rahul });
      vitalRows.push({ memberId: M.priya, kind: "weight", value: Math.round((58.8 + jitter(0.3)) * 10) / 10, measuredAt: raw(offset, "08:10"), loggedBy: U.priya });
    }
    if (offset % 3 === 0) {
      vitalRows.push({ memberId: M.kamala, kind: "bp", value: Math.round(124 + jitter(6)), value2: Math.round(80 + jitter(4)), measuredAt: raw(offset, "08:00"), loggedBy: U.priya });
    }
    if (offset % 10 === 0) {
      vitalRows.push({ memberId: M.rahul, kind: "bp", value: Math.round(122 + jitter(6)), value2: Math.round(79 + jitter(4)), measuredAt: raw(offset, "21:00"), loggedBy: U.rahul });
      vitalRows.push({ memberId: M.priya, kind: "bp", value: Math.round(112 + jitter(5)), value2: Math.round(72 + jitter(3)), measuredAt: raw(offset, "21:10"), loggedBy: U.priya });
    }
    if (offset % 14 === 0) {
      vitalRows.push({ memberId: M.aarav, kind: "weight", value: Math.round((28.6 + (offset + 60) * 0.008) * 10) / 10, measuredAt: raw(offset, "18:00"), loggedBy: U.priya });
    }
  }
  vitalRows.push(
    { memberId: M.aarav, kind: "temperature", value: 101.2, measuredAt: at(-7, "21:00"), note: "Fever, gave Calpol syrup", loggedBy: U.priya },
    { memberId: M.aarav, kind: "temperature", value: 99.6, measuredAt: at(-6, "08:00"), loggedBy: U.priya },
    { memberId: M.aarav, kind: "temperature", value: 98.4, measuredAt: at(-4, "08:00"), loggedBy: U.priya },
    { memberId: M.suresh, kind: "pulse", value: 78, measuredAt: at(0, "07:40"), loggedBy: U.suresh },
    { memberId: M.suresh, kind: "spo2", value: 97, measuredAt: at(0, "07:41"), loggedBy: U.suresh },
    { memberId: M.kamala, kind: "pulse", value: 74, measuredAt: at(-1, "08:00"), loggedBy: U.priya }
  );

  // Drop anything that would be in the future when seeding early in the day
  const pastVitals = vitalRows.filter((v) => (v.measuredAt as Date).getTime() <= now.getTime());

  // ---------- Doctors ----------
  const weekdays = (from: string, to: string, sat?: [string, string]) => ({
    "0": null,
    "1": [from, to] as [string, string],
    "2": [from, to] as [string, string],
    "3": [from, to] as [string, string],
    "4": [from, to] as [string, string],
    "5": [from, to] as [string, string],
    "6": sat ?? null,
  });
  const doctorRows: Insert<typeof doctors>[] = [
    { id: "e0000000-0000-4000-8000-000000000001", name: "Dr. Anjali Deshpande", specialty: "General Physician", clinic: "Deshpande Family Clinic, Kothrud", city: "Pune", languages: ["English", "Hindi", "Marathi"], yearsExperience: 18, fee: 500, rating: 4.8, teleconsult: true, hours: weekdays("10:00", "13:00", ["10:00", "12:00"]), slotMinutes: 15 },
    { id: "e0000000-0000-4000-8000-000000000002", name: "Dr. Farah Khan", specialty: "Endocrinologist (diabetes & thyroid)", clinic: "Jehangir Hospital, Sassoon Road", city: "Pune", languages: ["English", "Hindi", "Urdu"], yearsExperience: 14, fee: 1000, rating: 4.7, teleconsult: true, hours: weekdays("11:00", "15:00"), slotMinutes: 20 },
    { id: "e0000000-0000-4000-8000-000000000003", name: "Dr. Vikram Rao", specialty: "Cardiologist", clinic: "Ruby Hall Clinic, Bund Garden", city: "Pune", languages: ["English", "Hindi", "Kannada", "Telugu"], yearsExperience: 22, fee: 1200, rating: 4.9, teleconsult: true, hours: weekdays("16:00", "19:00", ["10:00", "13:00"]), slotMinutes: 20 },
    { id: "e0000000-0000-4000-8000-000000000004", name: "Dr. Karthik Iyer", specialty: "Paediatrician", clinic: "Rainbow Children's Clinic, Baner", city: "Pune", languages: ["English", "Hindi", "Tamil"], yearsExperience: 11, fee: 700, rating: 4.8, teleconsult: true, hours: weekdays("09:30", "12:30", ["09:30", "12:30"]), slotMinutes: 15 },
    { id: "e0000000-0000-4000-8000-000000000005", name: "Dr. Meenakshi Kulkarni", specialty: "Orthopaedic Surgeon", clinic: "Sahyadri Hospital, Deccan", city: "Pune", languages: ["English", "Marathi", "Hindi"], yearsExperience: 16, fee: 900, rating: 4.6, teleconsult: true, hours: weekdays("17:00", "20:00"), slotMinutes: 20 },
    { id: "e0000000-0000-4000-8000-000000000006", name: "Dr. Arjun Malhotra", specialty: "Pulmonologist (asthma & allergy)", clinic: "Aundh Chest Clinic, Aundh", city: "Pune", languages: ["English", "Hindi", "Punjabi"], yearsExperience: 9, fee: 800, rating: 4.7, teleconsult: true, hours: weekdays("10:00", "14:00"), slotMinutes: 20 },
    { id: "e0000000-0000-4000-8000-000000000007", name: "Dr. Sneha Banerjee", specialty: "Gynaecologist", clinic: "Cloudnine Hospital, Kalyani Nagar", city: "Pune", languages: ["English", "Hindi", "Bengali"], yearsExperience: 12, fee: 900, rating: 4.7, teleconsult: false, hours: weekdays("11:00", "16:00", ["11:00", "13:00"]), slotMinutes: 20 },
  ];

  // ---------- Appointments ----------
  const apptRows: Insert<typeof appointments>[] = [
    { memberId: M.suresh, doctorId: doctorRows[1].id, doctorName: "Dr. Farah Khan", specialty: "Endocrinologist", location: "Jehangir Hospital, Sassoon Road, Pune", startsAt: at(3, "11:20"), durationMin: 20, mode: "in_person", reason: "Quarterly diabetes review", notes: "Carry the HbA1c report and the BP diary. Fasting not needed.", createdBy: U.rahul },
    { memberId: M.kamala, doctorId: doctorRows[4].id, doctorName: "Dr. Meenakshi Kulkarni", specialty: "Orthopaedic Surgeon", location: "Video consult", startsAt: at(6, "17:40"), durationMin: 20, mode: "video", meetingUrl: "https://meet.jit.si/pulse-mehta-kamala-ortho", reason: "Knee pain follow-up", notes: "Keep the knee X-ray open to share on screen.", createdBy: U.priya },
    { memberId: M.aarav, doctorId: doctorRows[3].id, doctorName: "Dr. Karthik Iyer", specialty: "Paediatrician", location: "Rainbow Children's Clinic, Baner, Pune", startsAt: at(1, "10:15"), durationMin: 15, mode: "in_person", reason: "Post-fever check and asthma review", createdBy: U.priya },
    { memberId: M.priya, doctorName: "Metropolis Healthcare", specialty: "Lab test", location: "Metropolis Lab, Karve Road, Kothrud", startsAt: at(10, "08:00"), durationMin: 15, mode: "in_person", reason: "Thyroid profile (TSH)", notes: "Fasting 10 hours. Take Thyronorm after the blood sample.", createdBy: U.priya },
    { memberId: M.suresh, doctorId: doctorRows[0].id, doctorName: "Dr. Anjali Deshpande", specialty: "General Physician", location: "Deshpande Family Clinic, Kothrud", startsAt: at(-21, "10:30"), durationMin: 15, mode: "in_person", reason: "Cough and cold", notes: "Advised steam and warm fluids. No antibiotics needed.", status: "completed", createdBy: U.rahul },
    { memberId: M.aarav, doctorId: doctorRows[3].id, doctorName: "Dr. Karthik Iyer", specialty: "Paediatrician", location: "Video consult", startsAt: at(-6, "10:00"), durationMin: 15, mode: "video", meetingUrl: "https://meet.jit.si/pulse-mehta-aarav-fever", reason: "Fever 101°F", notes: "Viral fever. Paracetamol syrup if above 100°F, fluids. CBC done.", status: "completed", createdBy: U.priya },
    { memberId: M.rahul, doctorId: doctorRows[0].id, doctorName: "Dr. Anjali Deshpande", specialty: "General Physician", location: "Deshpande Family Clinic, Kothrud", startsAt: at(-45, "11:00"), durationMin: 15, mode: "in_person", reason: "Acidity", status: "completed", createdBy: U.rahul },
  ];

  // ---------- Records (synthetic report images) ----------
  const recordRows: MockData["records"] = [
    {
      memberId: M.suresh, type: "lab_report", title: "HbA1c and fasting sugar", recordDate: d(-20), provider: "Metropolis Healthcare, Kothrud", notes: "HbA1c 7.4%, down from 7.9% in June.",
      fileName: "suresh-hba1c.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Metropolis Healthcare", "Suresh Mehta · M · 68 y", d(-20), "Diabetes panel", [
        ["HbA1c (glycated haemoglobin)", "7.4", "%", "4.0 – 5.6", "H"],
        ["Fasting blood glucose", "134", "mg/dL", "70 – 100", "H"],
        ["Estimated average glucose", "166", "mg/dL", "—", ""],
        ["Serum creatinine", "1.0", "mg/dL", "0.7 – 1.3", ""],
      ]) },
      extracted: { highlights: ["HbA1c 7.4%", "Fasting glucose 134 mg/dL"] }, createdBy: U.rahul,
    },
    {
      memberId: M.suresh, type: "lab_report", title: "Lipid profile", recordDate: d(-20), provider: "Metropolis Healthcare, Kothrud",
      fileName: "suresh-lipid.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Metropolis Healthcare", "Suresh Mehta · M · 68 y", d(-20), "Lipid profile", [
        ["Total cholesterol", "182", "mg/dL", "< 200", ""],
        ["LDL cholesterol", "108", "mg/dL", "< 100", "H"],
        ["HDL cholesterol", "42", "mg/dL", "> 40", ""],
        ["Triglycerides", "160", "mg/dL", "< 150", "H"],
      ]) }, createdBy: U.rahul,
    },
    {
      memberId: M.suresh, type: "prescription", title: "Diabetes and BP prescription", recordDate: d(-92), provider: "Dr. Farah Khan, Jehangir Hospital",
      fileName: "suresh-rx.svg", mimeType: "image/svg+xml",
      file: { svg: prescriptionSvg("Dr. Farah Khan", "MD, DM (Endocrinology) · Reg. MMC 2009/04/1187", "Suresh Mehta, 68 M", d(-92), [
        "Tab. Glycomet 500 mg — 1-0-1 after food",
        "Tab. Telma 40 mg — 1-0-0 after breakfast",
        "Tab. Atorva 10 mg — 0-0-1 at bedtime",
        "Review after 3 months with HbA1c",
      ]) }, createdBy: U.rahul,
    },
    {
      memberId: M.suresh, type: "scan", title: "ECG (resting)", recordDate: d(-64), provider: "Ruby Hall Clinic", notes: "Normal sinus rhythm. No acute changes.",
      fileName: "suresh-ecg.svg", mimeType: "image/svg+xml", file: { svg: ecgSvg("Suresh Mehta · 68 M", d(-64)) }, createdBy: U.rahul,
    },
    {
      memberId: M.kamala, type: "scan", title: "Knee X-ray report (both knees)", recordDate: d(-45), provider: "Sahyadri Hospital, Deccan", notes: "Mild joint space narrowing, both knees. Physiotherapy advised.",
      fileName: "kamala-knee-xray.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Sahyadri Hospital · Radiology", "Kamala Mehta · F · 65 y", d(-45), "X-ray both knees (AP / lateral)", [
        ["Joint space", "Mildly reduced", "", "—", ""],
        ["Osteophytes", "Small, medial", "", "—", ""],
        ["Impression", "Early osteoarthritis", "", "—", ""],
      ]) }, createdBy: U.priya,
    },
    {
      memberId: M.kamala, type: "lab_report", title: "Thyroid profile", recordDate: d(-75), provider: "Thyrocare, Kothrud",
      fileName: "kamala-thyroid.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Thyrocare", "Kamala Mehta · F · 65 y", d(-75), "Thyroid profile", [
        ["TSH", "3.2", "µIU/mL", "0.4 – 4.5", ""],
        ["Free T4", "1.1", "ng/dL", "0.8 – 1.8", ""],
      ]) }, createdBy: U.priya,
    },
    {
      memberId: M.aarav, type: "lab_report", title: "Complete blood count (CBC)", recordDate: d(-6), provider: "Rainbow Children's Clinic lab", notes: "Viral pattern, platelets normal.",
      fileName: "aarav-cbc.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Rainbow Children's Clinic · Lab", "Aarav Mehta · M · 9 y", d(-6), "Complete blood count", [
        ["Haemoglobin", "12.4", "g/dL", "11.5 – 15.5", ""],
        ["Total WBC", "4,200", "/µL", "4,500 – 13,500", "L"],
        ["Platelets", "2.1", "lakh/µL", "1.5 – 4.5", ""],
      ]) }, createdBy: U.priya,
    },
    {
      memberId: M.aarav, type: "vaccination", title: "Vaccination record", recordDate: d(-300), provider: "Rainbow Children's Clinic", notes: "Typhoid booster and flu shot given. Next flu shot due in October.",
      fileName: "aarav-vaccines.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Rainbow Children's Clinic", "Aarav Mehta · M", d(-300), "Immunisation record", [
        ["Influenza (annual)", "Given", "", "Next: Oct", ""],
        ["Typhoid conjugate booster", "Given", "", "—", ""],
        ["Tdap booster", "Due at 10 y", "", "—", ""],
      ]) }, createdBy: U.priya,
    },
    {
      memberId: M.priya, type: "lab_report", title: "TSH test", recordDate: d(-130), provider: "Metropolis Healthcare, Kothrud",
      fileName: "priya-tsh.svg", mimeType: "image/svg+xml",
      file: { svg: reportSvg("Metropolis Healthcare", "Priya Mehta · F · 36 y", d(-130), "Thyroid stimulating hormone", [["TSH", "2.6", "µIU/mL", "0.4 – 4.5", ""]]) },
      createdBy: U.priya,
    },
  ];

  const shareRows: Insert<typeof shareLinks>[] = [
    { familyId: ID.family, memberId: M.suresh, token: "demo-suresh-emergency-card-7f3k2q", scope: "emergency", label: "Emergency card QR", expiresAt: at(30, "23:59"), viewCount: 2, lastViewedAt: at(-3, "12:00"), createdBy: U.rahul, createdAt: at(-10, "12:00") },
    { familyId: ID.family, memberId: M.suresh, token: "demo-suresh-summary-for-dr-khan-9p", scope: "summary", label: "For Dr. Farah Khan", expiresAt: at(3, "23:59"), viewCount: 0, createdBy: U.rahul, createdAt: at(-1, "18:00") },
    { familyId: ID.family, memberId: M.aarav, token: "demo-aarav-old-link-expired-2x8", scope: "summary", label: "For Dr. Iyer (fever)", expiresAt: at(-4, "23:59"), viewCount: 1, lastViewedAt: at(-6, "10:02"), createdBy: U.priya, createdAt: at(-6, "09:40") },
  ];

  const triageRows: Insert<typeof triageSessions>[] = [
    {
      memberId: M.aarav,
      symptoms: "Fever 101°F since last night, mild cough, eating less",
      answers: { durationDays: 1, severity: 4, temperatureF: 101.2 },
      level: "doctor",
      redFlags: [],
      source: "rules",
      language: "en",
      result: { summary: "Fever with a mild cough in a child, without warning signs.", selfCare: ["Fluids", "Rest"], seeDoctorIf: ["Fever above 103°F", "Fast breathing", "Not drinking"] },
      createdBy: U.priya,
      createdAt: at(-7, "21:30"),
    },
  ];

  const notificationRows: Insert<typeof notifications>[] = [
    { familyId: ID.family, memberId: M.suresh, kind: "abnormal_vital", severity: "warning", title: "Papa's BP is high this morning", body: "Suresh Mehta · 152/96 mmHg this morning. Recheck after 15 minutes of rest.", href: `/members/${M.suresh}?tab=vitals`, createdAt: at(0, "07:41"), dedupeKey: `seed-bp-${today}` },
    { familyId: ID.family, memberId: M.suresh, kind: "missed_dose", severity: "warning", title: "Missed: Glycomet 500 mg at 8:30 pm", body: "Suresh Mehta did not mark last night's dose.", href: "/medications", createdAt: at(-1, "22:31"), dedupeKey: `seed-miss-${today}` },
    { familyId: ID.family, memberId: M.suresh, kind: "interaction", severity: "urgent", title: "Brufen + Ecosprin: bleeding risk", body: "Suresh started Brufen 400 mg. With daily Ecosprin this raises the risk of stomach bleeding. Check with Dr. Khan.", href: `/medications?member=${M.suresh}#interactions`, createdAt: at(-3, "14:05"), dedupeKey: `seed-int-${today}` },
    { familyId: ID.family, memberId: M.suresh, kind: "refill", severity: "info", title: "Telma 40 mg: 5 tablets left", body: "About 5 days left. Order a refill this week.", href: "/medications", createdAt: at(-1, "09:00"), dedupeKey: `seed-refill-${today}` },
    { familyId: ID.family, memberId: M.aarav, kind: "appointment", severity: "info", title: "Tomorrow: Aarav with Dr. Karthik Iyer", body: "10:15 am · Rainbow Children's Clinic, Baner", href: "/appointments", createdAt: at(0, "07:00"), readAt: at(0, "08:00"), dedupeKey: `seed-appt-${today}` },
  ];

  return {
    users: usersRows,
    family,
    members: membersRows,
    medications: medsRows,
    doseLogs: doseRows,
    vitals: pastVitals,
    doctors: doctorRows,
    appointments: apptRows,
    records: recordRows,
    shareLinks: shareRows,
    triageSessions: triageRows,
    notifications: notificationRows,
  };
}

// ---------- Synthetic document images ----------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const FONT = "font-family='Helvetica, Arial, sans-serif'";

export function reportSvg(lab: string, patient: string, date: string, title: string, rows: [string, string, string, string, string][]): string {
  const rowSvg = rows
    .map(([test, value, unit, range, flag], i) => {
      const y = 300 + i * 52;
      const flagColor = flag === "H" ? "#b42318" : flag === "L" ? "#b54708" : "#1f2937";
      return `<g><rect x='48' y='${y - 30}' width='704' height='52' fill='${i % 2 ? "#ffffff" : "#f6f8f7"}'/>
<text x='64' y='${y}' font-size='19' fill='#1f2937'>${esc(test)}</text>
<text x='430' y='${y}' font-size='19' font-weight='700' fill='${flagColor}'>${esc(value)}${flag ? ` ${flag}` : ""}</text>
<text x='540' y='${y}' font-size='17' fill='#4b5563'>${esc(unit)}</text>
<text x='640' y='${y}' font-size='17' fill='#4b5563'>${esc(range)}</text></g>`;
    })
    .join("");
  return `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000' ${FONT}>
<rect width='800' height='1000' fill='#ffffff'/>
<rect width='800' height='110' fill='#0f5f5a'/>
<text x='48' y='62' font-size='30' font-weight='700' fill='#ffffff'>${esc(lab)}</text>
<text x='48' y='92' font-size='16' fill='#cde7e3'>NABL accredited laboratory · Synthetic demo document</text>
<text x='48' y='160' font-size='18' fill='#4b5563'>Patient</text><text x='160' y='160' font-size='18' font-weight='700' fill='#111827'>${esc(patient)}</text>
<text x='48' y='192' font-size='18' fill='#4b5563'>Date</text><text x='160' y='192' font-size='18' fill='#111827'>${esc(date)}</text>
<text x='48' y='246' font-size='24' font-weight='700' fill='#111827'>${esc(title)}</text>
<text x='64' y='272' font-size='14' fill='#6b7280'>TEST</text><text x='430' y='272' font-size='14' fill='#6b7280'>RESULT</text><text x='540' y='272' font-size='14' fill='#6b7280'>UNIT</text><text x='640' y='272' font-size='14' fill='#6b7280'>REFERENCE</text>
${rowSvg}
<line x1='48' y1='900' x2='752' y2='900' stroke='#e5e7eb'/>
<text x='48' y='936' font-size='14' fill='#6b7280'>H = above range, L = below range. Results must be read by a doctor.</text>
<text x='48' y='962' font-size='14' fill='#6b7280'>SYNTHETIC SAMPLE FOR DEMONSTRATION. NOT A REAL MEDICAL RECORD.</text>
</svg>`;
}

export function prescriptionSvg(doctor: string, credentials: string, patient: string, date: string, lines: string[]): string {
  const body = lines.map((l, i) => `<text x='96' y='${360 + i * 56}' font-size='22' fill='#1f2937'>${esc(l)}</text>`).join("");
  return `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000' ${FONT}>
<rect width='800' height='1000' fill='#fffdf8'/>
<text x='48' y='80' font-size='32' font-weight='700' fill='#0f5f5a'>${esc(doctor)}</text>
<text x='48' y='112' font-size='16' fill='#4b5563'>${esc(credentials)}</text>
<line x1='48' y1='140' x2='752' y2='140' stroke='#0f5f5a' stroke-width='2'/>
<text x='48' y='190' font-size='19' fill='#111827'>Patient: ${esc(patient)}</text>
<text x='560' y='190' font-size='19' fill='#111827'>Date: ${esc(date)}</text>
<text x='48' y='300' font-size='56' font-weight='700' fill='#0f5f5a'>℞</text>
${body}
<text x='520' y='880' font-size='18' fill='#4b5563'>Signature</text>
<path d='M520 850 q30 -40 60 0 t60 0 t60 -10' stroke='#1f2937' fill='none' stroke-width='2'/>
<text x='48' y='962' font-size='14' fill='#6b7280'>SYNTHETIC SAMPLE FOR DEMONSTRATION. NOT A REAL PRESCRIPTION.</text>
</svg>`;
}

export function ecgSvg(patient: string, date: string): string {
  let path = "M40 300";
  for (let x = 40; x < 760; x += 120) {
    path += ` L${x + 30} 300 L${x + 40} 290 L${x + 50} 300 L${x + 60} 300 L${x + 66} 320 L${x + 72} 200 L${x + 78} 340 L${x + 84} 300 L${x + 100} 300 L${x + 110} 285 L${x + 120} 300`;
  }
  return `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600' ${FONT}>
<defs><pattern id='g' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M20 0H0V20' fill='none' stroke='#f6c9c9' stroke-width='1'/></pattern></defs>
<rect width='800' height='600' fill='#fff7f7'/><rect x='20' y='120' width='760' height='360' fill='url(#g)'/>
<text x='40' y='60' font-size='26' font-weight='700' fill='#111827'>Resting ECG · Lead II</text>
<text x='40' y='92' font-size='16' fill='#4b5563'>${esc(patient)} · ${esc(date)} · 25 mm/s · HR 76 bpm</text>
<path d='${path}' fill='none' stroke='#111827' stroke-width='2'/>
<text x='40' y='540' font-size='18' fill='#111827'>Impression: Normal sinus rhythm</text>
<text x='40' y='572' font-size='13' fill='#6b7280'>SYNTHETIC SAMPLE FOR DEMONSTRATION. NOT A REAL MEDICAL RECORD.</text>
</svg>`;
}
