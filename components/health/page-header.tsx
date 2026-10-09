import { Illustration, type IllustrationName } from "@/components/brand/illustration";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  illustration,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  /** Turns the header into a soft card with a scene on the right (from sm up). Decorative only. */
  illustration?: IllustrationName;
  className?: string;
}) {
  if (illustration) {
    return (
      <header className={cn("group relative isolate flex items-center gap-6 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 lg:gap-10", className)}>
        <span aria-hidden="true" className="absolute -right-16 -bottom-24 -z-10 hidden size-80 rounded-full bg-brand-soft transition-transform duration-500 ease-out-soft group-hover:scale-110 sm:block" />
        <div className="min-w-0 flex-1 space-y-1.5">
          {eyebrow && <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">{title}</h1>
          {description && <p className="max-w-2xl text-base text-muted-foreground">{description}</p>}
          {actions && <div className="flex flex-wrap items-center gap-2 pt-3">{actions}</div>}
        </div>
        <div className="hidden w-44 shrink-0 animate-rise sm:block md:w-56 lg:w-64">
          <Illustration name={illustration} priority className="transition-transform duration-300 ease-out-soft group-hover:-translate-y-1.5 group-hover:scale-[1.04]" />
        </div>
      </header>
    );
  }
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">{title}</h1>
        {description && <p className="max-w-2xl text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
