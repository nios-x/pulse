import { redirect } from "next/navigation";

/** Target of the "Have an invite code?" form: /join?code=abc123 -> /join/ABC123 */
export default async function JoinRedirect({ searchParams }: PageProps<"/join">) {
  const { code } = await searchParams;
  const clean = typeof code === "string" ? code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
  redirect(clean ? `/join/${clean}` : "/home");
}
