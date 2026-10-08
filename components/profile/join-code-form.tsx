import { TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getT } from "@/lib/i18n-server";

/** A plain GET form to /join, so it works before JavaScript loads. */
export async function JoinCodeForm() {
  const { t } = await getT();
  return (
    <form action="/join" method="get" className="flex flex-col gap-2">
      <label htmlFor="join-code" className="flex items-center gap-2 text-base font-medium">
        <TicketIcon className="size-5 text-primary" aria-hidden />
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
          className="font-mono tracking-widest uppercase"
          required
        />
        <Button type="submit" size="touch" variant="secondary">
          {t("home.join")}
        </Button>
      </div>
    </form>
  );
}
