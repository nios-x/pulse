import Link from "next/link";
import { MemberAvatar } from "@/components/health/member-avatar";
import { cn } from "@/lib/utils";

/** Pill links to filter a page by family member (?member=). */
export function MemberFilter({ members, active, basePath, label = "Show" }: { members: { id: string; name: string; avatarTone: number }[]; active: string | null; basePath: string; label?: string }) {
  if (members.length < 2) return null;
  const item = "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[0.9375rem] font-medium transition-colors duration-150";
  return (
    <nav aria-label={`${label}: family member`} className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        <li>
          <Link href={basePath} aria-current={!active ? "page" : undefined} className={cn(item, !active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:bg-muted")}>
            Everyone
          </Link>
        </li>
        {members.map((m) => (
          <li key={m.id}>
            <Link href={`${basePath}${basePath.includes("?") ? "&" : "?"}member=${m.id}`} aria-current={active === m.id ? "page" : undefined} className={cn(item, "pl-1.5", active === m.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:bg-muted")}>
              <MemberAvatar name={m.name} tone={m.avatarTone} size="sm" />
              {m.name.split(" ")[0]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
