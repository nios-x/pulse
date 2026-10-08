import { requireUser } from "@/lib/auth";

// Every page under (app) needs a signed-in user; no middleware required.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
