import { TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getT } from "@/lib/i18n-server";

/** A plain GET form to /join, so it works before JavaScript loads. */
export async function JoinCodeForm() {
  const { t } = await getT();
  return (
    <form action="/join" method="get" className="flex flex-col gap-2">
      <label htmlFor="join-code" className="flex items-center gap-2 font-heading text-base font-semibold text-plum">
        <TicketIcon className="size-5 text-violet" aria-hidden />
        {t("home.haveCode")}
      </label>
      <div className="flex gap-2">
        <Input
          id="join-code"
          name="code"
          placeholder="ABC123"
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          className="h-12 rounded-full border-edge-strong px-5 font-heading text-lg font-semibold tracking-[0.3em] uppercase placeholder:tracking-[0.3em] placeholder:text-ink-3"
          required
        />
        <Button type="submit" size="touch" variant="brand" className="rounded-full px-6">
          {t("home.join")}
        </Button>
      </div>
    </form>
  );
}
