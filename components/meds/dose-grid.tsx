import { CheckIcon, XIcon } from "lucide-react";
import type { GridCell } from "@/lib/adherence";
import { formatSlot } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

/** 7 days across, one row per dose time: taken, missed, due or upcoming. */
export async function DoseGrid({
  rows,
  days,
}: {
  rows: { slot: string; cells: GridCell[] }[];
  days: string[];
}) {
  const { t, locale } = await getT();
  const weekday = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { weekday: "narrow", timeZone: "UTC" });
  const status = {
    taken: t("meds.status.taken"),
    missed: t("meds.status.missed"),
    due: t("meds.status.due"),
    upcoming: t("meds.status.upcoming"),
    none: t("meds.status.none"),
  };

  return (
    <table className="w-full table-fixed border-separate border-spacing-1 text-center">
      <thead>
        <tr>
          <th className="w-14" />
          {days.map((d) => (
            <th key={d} scope="col" className="text-xs font-medium text-muted-foreground">
              {weekday.format(new Date(`${d}T00:00:00Z`))}
              <span className="block text-[0.7rem] font-normal">{Number(d.slice(8))}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.slot}>
            <th scope="row" className="pr-1 text-left text-xs font-medium whitespace-nowrap text-muted-foreground">
              {formatSlot(row.slot, locale)}
            </th>
            {row.cells.map((cell) => (
              <td key={cell.date} className="p-0">
                <span
                  title={status[cell.status]}
                  className={cn(
                    "mx-auto flex aspect-square w-full max-w-9 items-center justify-center rounded-full",
                    cell.status === "taken" && "bg-go text-white",
                    cell.status === "missed" && "bg-alert-wash text-alert-ink",
                    cell.status === "due" && "border-2 border-watch bg-watch-wash",
                    cell.status === "upcoming" && "border-2 border-dashed border-edge-strong",
                    cell.status === "none" && "bg-transparent"
                  )}
                >
                  {cell.status === "taken" ? <CheckIcon className="size-4" aria-hidden /> : null}
                  {cell.status === "missed" ? <XIcon className="size-4" aria-hidden /> : null}
                  <span className="sr-only">{status[cell.status]}</span>
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
