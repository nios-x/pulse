import { LogOutIcon } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { getT } from "@/lib/i18n-server";

export async function SignOutButton() {
  const { t } = await getT();
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex h-12 w-full items-center gap-3.5 rounded-xl px-3 text-base font-medium text-ink-2 transition-colors hover:bg-alert-wash hover:text-alert-ink"
      >
        <span className="flex size-9 items-center justify-center">
          <LogOutIcon className="size-5" aria-hidden />
        </span>
        {t("auth.signOut")}
      </button>
    </form>
  );
}
