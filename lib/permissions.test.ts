import { describe, expect, it } from "vitest";
import { applyToggle, can, canToggle, denialReason, effectiveMatrix, type AccessContext } from "./permissions";

const papa = "m-papa";
const maa = "m-maa";
const rahul = "m-rahul";

const ctx = (role: AccessContext["role"], extra: Partial<AccessContext> = {}): AccessContext => ({
  role,
  selfMemberId: rahul,
  assignedMemberIds: [],
  overrides: {},
  ...extra,
});

describe("permissions", () => {
  it("admin can do everything for everyone", () => {
    expect(can(ctx("admin"), "meds.manage", papa)).toBe(true);
    expect(can(ctx("admin"), "family.manage")).toBe(true);
  });

  it("viewer is read-only", () => {
    expect(can(ctx("viewer"), "member.view", papa)).toBe(true);
    expect(can(ctx("viewer"), "records.view", papa)).toBe(true);
    expect(can(ctx("viewer"), "doses.log", papa)).toBe(false);
    expect(denialReason(ctx("viewer"), "doses.log", papa)).toMatch(/Viewers can look/);
  });

  it("caregiver only reaches assigned members", () => {
    const c = ctx("caregiver", { assignedMemberIds: [papa] });
    expect(can(c, "meds.manage", papa)).toBe(true);
    expect(can(c, "meds.manage", maa)).toBe(false);
    expect(denialReason(c, "meds.manage", maa)).toMatch(/assigned/);
    expect(can(c, "member.edit", papa)).toBe(false);
    expect(can(c, "family.manage")).toBe(false);
  });

  it("member only reaches their own profile", () => {
    const m = ctx("member");
    expect(can(m, "vitals.log", rahul)).toBe(true);
    expect(can(m, "member.view", papa)).toBe(false);
    expect(denialReason(m, "member.view", papa)).toMatch(/own/);
  });

  it("overrides from the matrix change what a role can do", () => {
    const overrides = applyToggle({}, "caregiver", "member.edit", true);
    expect(can(ctx("caregiver", { assignedMemberIds: [papa], overrides }), "member.edit", papa)).toBe(true);
    const off = applyToggle({}, "member", "meds.manage", false);
    const m = ctx("member", { overrides: off });
    expect(can(m, "meds.manage", rahul)).toBe(false);
    expect(denialReason(m, "meds.manage", rahul)).toMatch(/turned this off/);
  });

  it("locks the admin row, family.manage and viewer writes", () => {
    expect(canToggle("admin", "meds.manage")).toBe(false);
    expect(canToggle("caregiver", "family.manage")).toBe(false);
    expect(canToggle("viewer", "doses.log")).toBe(false);
    expect(canToggle("viewer", "records.view")).toBe(true);
    expect(() => applyToggle({}, "admin", "meds.manage", false)).toThrow();
    // A forged override for a locked cell is ignored
    expect(can(ctx("viewer", { overrides: { viewer: { "doses.log": true } } }), "doses.log", papa)).toBe(false);
  });

  it("setting a cell back to its default removes the override", () => {
    const on = applyToggle({}, "caregiver", "member.edit", true);
    const back = applyToggle(on, "caregiver", "member.edit", false);
    expect(back.caregiver).toEqual({});
    expect(effectiveMatrix(back).caregiver["member.edit"]).toBe(false);
  });
});
