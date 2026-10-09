import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { CelebrationHost } from "@/components/game/rewards";
import { AccessProvider } from "@/components/providers/access-provider";
import { AppShell } from "@/components/shell/app-shell";
import { getContext } from "@/lib/context";
import { getNotifications, getUnreadCount } from "@/lib/data";
import { getGameSummaries } from "@/lib/game-data";
import { relationLabel, timeAgo } from "@/lib/labels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const [notes, unread, games] = await Promise.all([getNotifications(ctx.family.id, 15), getUnreadCount(ctx.family.id), getGameSummaries([ctx.self.id], 60)]);
  const game = games.get(ctx.self.id)!;
  const visibleIds = new Set(ctx.visibleMembers.map((m) => m.id));
  const items = notes
    .filter((n) => n.kind !== "digest" && (!n.memberId || visibleIds.has(n.memberId)))
    .map((n) => ({
      id: n.id,
      kind: n.kind,
      severity: n.severity,
      title: n.title,
      body: n.body,
      href: n.href,
      createdAt: n.createdAt.toISOString(),
      unread: !n.readAt,
      ago: timeAgo(n.createdAt),
    }));

  return (
    <AccessProvider value={{ access: ctx.access, actualRole: ctx.actualRole, viewingAs: ctx.viewingAs }}>
      <AppShell
        familyName={ctx.family.name}
        role={ctx.role}
        actualRole={ctx.actualRole}
        viewingAs={ctx.viewingAs}
        members={ctx.visibleMembers.map((m) => ({
          id: m.id,
          name: m.name,
          avatarTone: m.avatarTone,
          relationLabel: relationLabel(m.relation, m.sex, m.id === ctx.self.id),
        }))}
        user={{ name: ctx.user.name, email: ctx.user.email, tone: ctx.self.avatarTone, selfId: ctx.self.id }}
        notifications={items}
        unread={Math.min(unread, items.filter((i) => i.unread).length)}
        streak={game.streak}
        level={game.level.name}
      >
        {children}
        <CelebrationHost />
        <AssistantWidget userName={ctx.user.name} people={ctx.visibleMembers.map((m) => ({ name: m.name, isSelf: m.id === ctx.self.id }))} />
      </AppShell>
    </AccessProvider>
  );
}
