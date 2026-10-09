import type { Relation, RecordType } from "@/db/schema";

export const RELATION_LABEL: Record<Relation, string> = {
  self: "You",
  spouse: "Spouse",
  parent: "Parent",
  child: "Child",
  grandparent: "Grandparent",
  sibling: "Sibling",
  other: "Family",
};

/** A warmer label for a member card: "Papa", "Maa"… falls back to the relation. */
export function relationLabel(relation: Relation, sex: string | null, isMe: boolean): string {
  if (isMe) return "You";
  if (relation === "parent") return sex === "female" ? "Mother" : sex === "male" ? "Father" : "Parent";
  if (relation === "child") return sex === "female" ? "Daughter" : sex === "male" ? "Son" : "Child";
  if (relation === "spouse") return sex === "female" ? "Wife" : sex === "male" ? "Husband" : "Spouse";
  if (relation === "grandparent") return sex === "female" ? "Grandmother" : sex === "male" ? "Grandfather" : "Grandparent";
  if (relation === "self") return "Account holder";
  return RELATION_LABEL[relation];
}

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  scan: "Scan or X-ray",
  discharge: "Discharge summary",
  vaccination: "Vaccination",
  other: "Other",
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

export function timeAgo(d: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
}

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
