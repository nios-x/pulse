import { LogOutIcon } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { getT } from "@/lib/i18n-server";

export async function SignOutButton() {
  const { t } = await getT();
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-base text-muted-foreground hover:bg-muted"
      >
        <LogOutIcon className="size-5" aria-hidden />
        {t("auth.signOut")}
      </button>
    </form>
  );
}
