import { AppShell } from "@/components/shell/app-shell";
import { requirePermission } from "@/lib/permissions";

export default async function PatientLayout({
  children,
  params,
}: LayoutProps<"/p/[patientId]">) {
  const { patientId } = await params;
  const { patient } = await requirePermission(patientId, "view_summary");
  return <AppShell patient={patient}>{children}</AppShell>;
}
