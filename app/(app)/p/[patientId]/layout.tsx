import { AppShell } from "@/components/shell/app-shell";

export default async function PatientLayout({
  children,
  params,
}: LayoutProps<"/p/[patientId]">) {
  const { patientId } = await params;
  return <AppShell patient={{ id: patientId }}>{children}</AppShell>;
}
