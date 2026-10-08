import { describe, expect, it } from "vitest";
import { permissionMap, PERMISSIONS } from "@/lib/permissions";
import {
  APP_ROLE_OF,
  DEFAULT_MATRIX,
  decodeMatrix,
  encodeMatrix,
  MATRIX_ACTIONS,
  previewPermissions,
  toggleMatrix,
} from "@/lib/roles";

const ctx = { patientHasOwner: true };
const head = permissionMap({ role: "caregiver", scopes: ["vitals", "meds", "meals"] }, ctx);
const owner = permissionMap({ role: "owner", scopes: [] }, ctx);

describe("APP_ROLE_OF", () => {
  it("names every database role", () => {
    expect(APP_ROLE_OF).toEqual({ caregiver: "admin", family: "caregiver", owner: "member", doctor: "viewer" });
  });
});

describe("previewPermissions", () => {
  it("never grants a permission the real role lacks", () => {
    const family = permissionMap({ role: "family", scopes: ["meals"] }, ctx);
    const preview = previewPermissions(family, "admin", DEFAULT_MATRIX, "family");
    for (const p of PERMISSIONS) if (!family[p]) expect(preview[p]).toBe(false);
  });

  it("previews a Caregiver: doses yes, members no", () => {
    const preview = previewPermissions(head, "caregiver", DEFAULT_MATRIX, "caregiver");
    expect(preview.mark_dose).toBe(true);
    expect(preview.manage_meds).toBe(true);
    expect(preview.manage_members).toBe(false);
    expect(preview.edit_patient).toBe(false);
  });

  it("previews a Viewer as read-only", () => {
    const preview = previewPermissions(head, "viewer", DEFAULT_MATRIX, "caregiver");
    expect(preview.view_summary).toBe(true);
    expect(preview.view_vitals).toBe(true);
    expect(preview.mark_dose).toBe(false);
    expect(preview.log_glucose).toBe(false);
    expect(preview.book_call).toBe(false);
  });

  it("closes someone else's profile to a Member", () => {
    const preview = previewPermissions(head, "member", DEFAULT_MATRIX, "caregiver");
    expect(Object.values(preview).every((v) => v === false)).toBe(true);
  });

  it("opens your own profile to a Member", () => {
    const preview = previewPermissions(owner, "member", DEFAULT_MATRIX, "owner");
    expect(preview.view_summary).toBe(true);
    expect(preview.manage_members).toBe(false);
  });

  it("follows a toggled matrix", () => {
    const matrix = toggleMatrix(DEFAULT_MATRIX, "caregiver", "manage_meds", false);
    expect(previewPermissions(head, "caregiver", matrix, "caregiver").manage_meds).toBe(false);
  });
});

describe("matrix cookie", () => {
  it("round-trips", () => {
    const matrix = toggleMatrix(DEFAULT_MATRIX, "viewer", "mark_doses", true);
    expect(decodeMatrix(encodeMatrix(matrix))).toEqual(matrix);
  });

  it("falls back to defaults for missing or junk roles", () => {
    expect(decodeMatrix("nonsense")).toEqual(DEFAULT_MATRIX);
    expect(decodeMatrix("viewer:view_health,hack").viewer).toEqual(["view_health"]);
    expect(decodeMatrix("viewer:view_health").admin).toEqual(MATRIX_ACTIONS);
  });
});
