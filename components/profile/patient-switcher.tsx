import Link from "next/link";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n-server";

/** Chips for every patient I belong to. */
export async function PatientSwitcher({
  patients,
  activeId,
}: {
  patients: { id: string; name: string }[];
  activeId: string | null;
}) {
  const { t } = await getT();
  return (
    <nav aria-label={t("home.switchPatient")} className="-mx-4 mb-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {patients.map((p) => (
          <li key={p.id}>
            <Link
              href={`/home?p=${p.id}`}
              aria-current={p.id === activeId ? "true" : undefined}
              className={cn(
                "flex h-11 items-center rounded-full px-4 font-heading text-[0.9375rem] font-medium whitespace-nowrap transition-colors",
                p.id === activeId
                  ? "bg-lilac font-semibold text-violet-deep"
                  : "bg-card text-ink-2 shadow-card hover:text-violet-deep"
              )}
            >
              {p.name}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/pcos"
            className="flex h-11 items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-50/60 dark:bg-teal-950/40 px-4 text-base font-semibold whitespace-nowrap text-teal-700 dark:text-teal-300 hover:bg-teal-100/70 transition-colors"
          >
            <span>🌸</span>
            <span>PCOS Companion</span>
          </Link>
        </li>
        <li>
          <Link
            href="/new"
            className="flex h-11 items-center gap-1 rounded-full border border-dashed px-4 text-base whitespace-nowrap text-muted-foreground hover:bg-muted"
          >
            <PlusIcon className="size-5" aria-hidden />
            {t("home.createProfile")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
