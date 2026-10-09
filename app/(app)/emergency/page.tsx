import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";

export default async function EmergencyIndex() {
  const ctx = await getContext();
  redirect(`/emergency/${ctx.self.id}`);
}
