import Link from "next/link";
import { Eye } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { StreakFlame } from "@/components/game/streak-flame";
import { RoleBadge } from "@/components/health/role-badge";
import type { Role } from "@/db/schema";
import { ROLE_LABEL } from "@/lib/permissions";
import { BottomTabs } from "./bottom-tabs";
import { ExitPreviewButton } from "./exit-preview";
import { NotificationsMenu, type NotificationItem } from "./notifications-menu";
import { SidebarNav, type NavMember } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { ViewAsSwitcher } from "./view-as-switcher";

export function AppShell({
  children,
  familyName,
  role,
  actualRole,
  viewingAs,
  members,
  user,
  notifications,
  unread,
  streak,
  level,
}: {
  children: React.ReactNode;
  familyName: string;
  role: Role;
  actualRole: Role;
  viewingAs: Role | null;
  members: NavMember[];
  user: { name: string; email: string; tone: number; selfId: string };
  notifications: NotificationItem[];
  unread: number;
  streak: number;
  level: string;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-18 items-center px-5">
          <Link href="/dashboard" className="rounded-lg" aria-label="Pulse home">
            <Logo />
          </Link>
        </div>
        <SidebarNav members={members} />
        <div className="p-3">
          <Link href="/progress" className="flex items-center gap-3 rounded-2xl bg-brand p-3.5 text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5">
            <StreakFlame days={streak} size="sm" onDark />
            <span className="min-w-0 text-sm leading-tight">
              <span className="block font-semibold">{level}</span>
              <span className="block truncate opacity-85">{familyName}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {viewingAs && (
          <div role="status" className="no-print flex items-center justify-center gap-3 border-b border-warning-border bg-warning-soft px-4 py-2 text-sm text-warning">
            <Eye className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Previewing as <strong className="font-semibold">{ROLE_LABEL[viewingAs]}</strong>. Permissions are applied for real.
            </span>
            <ExitPreviewButton />
          </div>
        )}
        <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-18 lg:px-8">
            <Link href="/dashboard" className="rounded-lg lg:hidden" aria-label="Pulse home">
              <LogoMark />
            </Link>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="hidden truncate text-base font-medium sm:inline">{familyName}</span>
              <RoleBadge role={role} />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link href="/progress" aria-label={`Your streak: ${streak} days, level ${level}. Open progress and rewards`} className="rounded-full px-1.5 py-1 transition-colors hover:bg-muted">
                <StreakFlame days={streak} size="sm" />
              </Link>
              {actualRole === "admin" && <ViewAsSwitcher current={role} className="hidden md:inline-flex" />}
              <NotificationsMenu items={notifications} unread={unread} />
              <ThemeToggle />
              <UserMenu {...user} />
            </div>
          </div>
          {actualRole === "admin" && (
            <div className="border-t border-border px-4 py-2 md:hidden">
              <ViewAsSwitcher current={role} className="w-full justify-center" />
            </div>
          )}
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>
      <BottomTabs members={members} />
    </div>
  );
}

