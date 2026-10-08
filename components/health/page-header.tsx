import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title, one line of context, and the screen's one primary action. */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
        {subtitle ? <p className="text-base text-ink-2 sm:text-lg">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

/** A section heading inside a page, with an optional quiet link on the right. */
export function SectionHeading({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-xl font-semibold tracking-[-0.02em]">
        {children}
      </h2>
      {aside}
    </div>
  );
}
