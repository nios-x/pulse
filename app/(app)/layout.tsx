import { CallProvider } from "@/components/call/call-provider";
import { requireUser } from "@/lib/auth";

// Every page under (app) needs a signed-in user; no middleware required.
// The call provider connects to signaling once per session and keeps the
// pages mounted underneath an active call.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <CallProvider>{children}</CallProvider>;
}
