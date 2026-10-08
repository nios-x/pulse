import { cache } from "react";
import { cookies } from "next/headers";
import { requirePermission, type Permission } from "@/lib/permissions";
import { APP_ROLE_OF, decodeMatrix, isAppRole, previewPermissions, type AppRole } from "@/lib/roles";

export const VIEW_AS_COOKIE = "pulse_view_as";
export const MATRIX_COOKIE = "pulse_matrix";

/** The demo "View as" role and the matrix it reads, from cookies. */
export const getPreview = cache(async () => {
  const jar = await cookies();
  const value = jar.get(VIEW_AS_COOKIE)?.value;
  return {
    viewAs: isAppRole(value) ? value : null,
    matrix: decodeMatrix(jar.get(MATRIX_COOKIE)?.value),
  };
});

/**
 * requirePermission plus what the UI may offer. `can` is the real map with the
 * View-as preview applied on top; server actions still check the real one.
 */
export async function requireView(patientId: string, permission: Permission) {
  const access = await requirePermission(patientId, permission);
  const { viewAs, matrix } = await getPreview();
  const realRole: AppRole = APP_ROLE_OF[access.membership.role];
  const can = viewAs
    ? previewPermissions(access.permissions, viewAs, matrix, access.membership.role)
    : access.permissions;
  return { ...access, can, viewAs, appRole: viewAs ?? realRole, realRole };
}
