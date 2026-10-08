import { describe, expect, it, vi } from "vitest";

// can() is pure; stub the server-only modules that requirePermission() pulls in.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/navigation", () => ({ forbidden: vi.fn() }));

import type { Role, Scope } from "@/db/schema";
import {
  can,
  defaultScopes,
  PERMISSIONS,
  permissionMap,
  ROLES,
  SCOPES,
  type Permission,
} from "./permissions";

// The "Family roles and permissions" table, cell by cell.
// true = yes, false = no, Scope[] = only if all those scopes are shared,
// "until_owner" = only until the patient joins as owner.
type Cell = boolean | readonly Scope[] | "until_owner";
const TABLE: Record<Permission, Record<Role, Cell>> = {
  view_summary: { owner: true, caregiver: true, family: true },
  view_vitals: { owner: true, caregiver: ["vitals"], family: ["vitals"] },
  view_meals: { owner: true, caregiver: ["meals"], family: ["meals"] },
  view_meds: { owner: true, caregiver: ["meds"], family: ["meds"] },
  log_glucose: { owner: true, caregiver: true, family: false },
  manage_meds: { owner: true, caregiver: true, family: false },
  mark_dose: { owner: true, caregiver: true, family: true },
  log_meals: { owner: true, caregiver: true, family: true },
  log_checkin: { owner: true, caregiver: true, family: true },
  log_labs: { owner: true, caregiver: true, family: false },
  edit_patient: { owner: true, caregiver: true, family: false },
  view_mood: { owner: true, caregiver: ["mood"], family: false },
  answer_mood: { owner: true, caregiver: false, family: false },
  view_insights: { owner: true, caregiver: ["vitals", "meals"], family: false },
  receive_alerts: { owner: true, caregiver: true, family: ["vitals"] },
  manage_members: { owner: true, caregiver: "until_owner", family: false },
  create_share_link: { owner: true, caregiver: true, family: false },
  delete_patient: { owner: true, caregiver: false, family: false },
};

function expected(cell: Cell, scopes: readonly Scope[], patientHasOwner: boolean): boolean {
  if (cell === "until_owner") return !patientHasOwner;
  if (typeof cell === "boolean") return cell;
  return cell.every((s) => scopes.includes(s));
}

// Every subset of the four scopes.
const SCOPE_SETS: Scope[][] = Array.from({ length: 1 << SCOPES.length }, (_, mask) =>
  SCOPES.filter((_, i) => mask & (1 << i))
);

describe("can() matches every cell of the permissions table", () => {
  it("covers every permission", () => {
    expect(Object.keys(TABLE).sort()).toEqual([...PERMISSIONS].sort());
  });

  for (const permission of PERMISSIONS) {
    for (const role of ROLES) {
      it(`${role} / ${permission}`, () => {
        for (const scopes of SCOPE_SETS) {
          for (const patientHasOwner of [true, false]) {
            const want = expected(TABLE[permission][role], scopes, patientHasOwner);
            expect(
              can({ role, scopes }, permission, { patientHasOwner }),
              `scopes=[${scopes}] hasOwner=${patientHasOwner}`
            ).toBe(want);
          }
        }
      });
    }
  }
});

describe("journey rules", () => {
  const ctx = { patientHasOwner: true };
  const rahul = { role: "caregiver" as const, scopes: defaultScopes("caregiver") };
  const maa = { role: "family" as const, scopes: defaultScopes("family") };

  it("a non-member can do nothing", () => {
    for (const p of PERMISSIONS) expect(can(null, p, ctx)).toBe(false);
  });

  it("mood is off for every new member until the patient turns it on", () => {
    expect(defaultScopes("caregiver")).not.toContain("mood");
    expect(defaultScopes("family")).not.toContain("mood");
    expect(can(rahul, "view_mood", ctx)).toBe(false);
    expect(can({ ...rahul, scopes: [...rahul.scopes, "mood"] }, "view_mood", ctx)).toBe(true);
  });

  it("only the patient answers the weekly check", () => {
    expect(can({ role: "owner", scopes: [] }, "answer_mood", ctx)).toBe(true);
    expect(can({ ...rahul, scopes: [...SCOPES] }, "answer_mood", ctx)).toBe(false);
  });

  it("family logs meals and ticks doses but cannot log sugar or edit medicines", () => {
    expect(can(maa, "log_meals", ctx)).toBe(true);
    expect(can(maa, "mark_dose", ctx)).toBe(true);
    expect(can(maa, "log_glucose", ctx)).toBe(false);
    expect(can(maa, "manage_meds", ctx)).toBe(false);
  });

  it("Maa gets sugar alerts only with the vitals scope; Rahul always does", () => {
    expect(can(maa, "receive_alerts", ctx)).toBe(false);
    expect(can({ ...maa, scopes: ["meals", "vitals"] }, "receive_alerts", ctx)).toBe(true);
    expect(can({ ...rahul, scopes: [] }, "receive_alerts", ctx)).toBe(true);
  });

  it("the caregiver who set up the profile loses member management once the patient joins", () => {
    expect(can(rahul, "manage_members", { patientHasOwner: false })).toBe(true);
    expect(can(rahul, "manage_members", { patientHasOwner: true })).toBe(false);
  });

  it("permissionMap agrees with can()", () => {
    const map = permissionMap(maa, ctx);
    for (const p of PERMISSIONS) expect(map[p]).toBe(can(maa, p, ctx));
  });
});
