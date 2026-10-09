import type { Metadata } from "next";
import { and, eq, gt, isNull } from "drizzle-orm";
import { History } from "lucide-react";
import { db } from "@/db";
import { doctorAccess, doctors } from "@/db/schema";
import { DoctorsPanel } from "@/components/settings/doctors-panel";
import { PageHeader } from "@/components/health/page-header";
import { AccountPanel } from "@/components/settings/account-panel";
import { InvitePanel } from "@/components/settings/invite-panel";
import { MembersPanel } from "@/components/settings/members-panel";
import { PermissionMatrix } from "@/components/settings/permission-matrix";
import { SharingPanel } from "@/components/settings/sharing-panel";
import { TabLinks } from "@/components/shell/tab-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { allowed, getContext } from "@/lib/context";
import { getAudit, getFamilyUsers, getInvites, getShareLinks } from "@/lib/data";
import { ageFrom, formatDate, formatDateTime, nowMs } from "@/lib/dates";
import { appUrl } from "@/lib/email-templates";
import { relationLabel, timeAgo } from "@/lib/labels";
import { mailMode } from "@/lib/mailer";
import { effectiveMatrix } from "@/lib/permissions";

export const metadata: Metadata = { title: "Family settings" };

const TABS = [
  { key: "members", label: "Members" },
  { key: "invites", label: "Invites" },
  { key: "roles", label: "Roles & permissions" },
  { key: "doctors", label: "Doctors" },
  { key: "privacy", label: "Sharing & privacy" },
  { key: "account", label: "Account" },
] as const;

const AUDIT_LABEL: Record<string, string> = {
  "family.created": "created the family",
  "member.added": "added a family member",
  "member.updated": "updated a profile",
  "member.removed": "removed a family member",
  "member.role_changed": "changed a role",
  "member.assignments_changed": "changed caregiver assignments",
  "member.health_info_updated": "updated allergies or conditions",
  "invite.created": "created an invite",
  "invite.accepted": "joined with an invite",
  "invite.revoked": "cancelled an invite",
  "permission.changed": "changed a permission",
  "permission.reset": "reset permissions",
  "share.created": "created a share link",
  "share.revoked": "turned off a share link",
  "share.viewed": "share link opened",
  "record.uploaded": "uploaded a record",
  "record.deleted": "deleted a record",
  "medication.added": "added a medicine",
  "medication.updated": "edited a medicine",
  "medication.stopped": "stopped a medicine",
  "medication.deleted": "deleted a medicine",
  "prescription.scanned": "scanned a prescription",
  "appointment.booked": "booked an appointment",
  "account.password_changed": "changed their password",
  "doctor.connected": "connected a doctor",
  "doctor.revoked": "removed a doctor's access",
  "doctor.note_added": "doctor added a note",
  "plan.started": "started a care plan",
  "pcos.setup": "set up PCOS care",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; member?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "members";
  const manage = allowed(ctx, "family.manage");

  return (
    <div className="flex flex-col gap-8 animate-rise">
      <PageHeader title="Family settings" description={`Members, invites, who can do what, and how the ${ctx.family.name}'s information is shared.`} />
      <TabLinks label="Settings sections" active={tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: `/settings?tab=${t.key}` }))} />
      {tab === "members" && <MembersTab />}
      {tab === "invites" && <InvitesTab presetMember={sp.member ?? null} />}
      {tab === "roles" && <PermissionMatrix matrix={effectiveMatrix(ctx.family.permissions ?? {})} />}
      {tab === "doctors" && <DoctorsTab />}
      {tab === "privacy" && <PrivacyTab />}
      {tab === "account" && <AccountPanel user={ctx.user} mailMode={mailMode()} canExport={manage} />}
    </div>
  );
}

async function MembersTab() {
  const ctx = await getContext();
  const emails = await getFamilyUsers(ctx.members.map((m) => m.userId).filter(Boolean) as string[]);
  return (
    <MembersPanel
      members={ctx.members.map((m) => ({
        id: m.id,
        name: m.name,
        relation: m.relation,
        relationLabel: relationLabel(m.relation, m.sex, m.id === ctx.self.id),
        role: m.role,
        avatarTone: m.avatarTone,
        email: m.userId ? emails.get(m.userId)?.email ?? null : null,
        hasLogin: Boolean(m.userId),
        isMe: m.id === ctx.self.id,
        age: ageFrom(m.dateOfBirth),
        assignedMemberIds: m.assignedMemberIds,
      }))}
    />
  );
}

async function InvitesTab({ presetMember }: { presetMember: string | null }) {
  const ctx = await getContext();
  const invites = await getInvites(ctx.family.id);
  const names = new Map(ctx.members.map((m) => [m.id, m.name]));
  return (
    <InvitePanel
      origin={appUrl("")}
      presetMemberId={presetMember}
      profiles={ctx.members.filter((m) => !m.userId).map((m) => ({ id: m.id, name: m.name }))}
      invites={invites.map((i) => ({ id: i.id, code: i.code, role: i.role, email: i.email, memberName: i.memberId ? names.get(i.memberId) ?? null : null, expires: formatDate(i.expiresAt) }))}
    />
  );
}

async function DoctorsTab() {
  const ctx = await getContext();
  const rows = await db
    .select({ access: doctorAccess, doctor: doctors })
    .from(doctorAccess)
    .innerJoin(doctors, eq(doctorAccess.doctorId, doctors.id))
    .where(and(eq(doctorAccess.familyId, ctx.family.id), isNull(doctorAccess.revokedAt), gt(doctorAccess.expiresAt, new Date())));
  const visible = new Map(ctx.visibleMembers.map((m) => [m.id, m]));
  return (
    <DoctorsPanel
      members={ctx.visibleMembers.map((m) => ({ id: m.id, name: m.name }))}
      connections={rows
        .filter((r) => visible.has(r.access.memberId))
        .map((r) => ({
          id: r.access.id,
          doctor: r.doctor.name,
          specialty: r.doctor.specialty,
          memberId: r.access.memberId,
          memberName: visible.get(r.access.memberId)!.name,
          tone: visible.get(r.access.memberId)!.avatarTone,
          reason: r.access.reason,
          until: formatDate(r.access.expiresAt),
        }))}
    />
  );
}

async function PrivacyTab() {
  const ctx = await getContext();
  const [links, auditRows] = await Promise.all([getShareLinks(ctx.family.id), getAudit(ctx.family.id, 25)]);
  const visible = new Set(ctx.visibleMembers.map((m) => m.id));
  const names = new Map(ctx.members.map((m) => [m.id, m.name]));
  const now = nowMs();
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Share links</h2>
        <SharingPanel
          members={ctx.visibleMembers.map((m) => ({ id: m.id, name: m.name }))}
          links={links
            .filter((l) => visible.has(l.memberId))
            .map((l) => ({
              id: l.id,
              memberId: l.memberId,
              memberName: names.get(l.memberId) ?? "",
              scope: l.scope,
              label: l.label,
              status: l.revokedAt ? "revoked" : l.expiresAt.getTime() < now ? "expired" : "active",
              expires: formatDateTime(l.expiresAt),
              views: l.viewCount,
              lastViewed: l.lastViewedAt ? timeAgo(l.lastViewedAt) : null,
              url: appUrl(`/share/${l.token}`),
            }))}
        />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>How your data is protected</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-[0.9375rem]">
              <li><span className="font-semibold">Consent first.</span> Everyone agrees to how data is used when they sign up, and you confirm consent each time you share.</li>
              <li><span className="font-semibold">Encrypted records.</span> Uploaded reports and prescriptions are encrypted with AES-256-GCM before they are stored.</li>
              <li><span className="font-semibold">Time-limited sharing.</span> Doctor links expire on their own and can be turned off at any time.</li>
              <li><span className="font-semibold">Least access.</span> Roles decide who can see and change what, and the server checks every request.</li>
              <li><span className="font-semibold">A full log.</span> Changes to roles, records and sharing are recorded below.</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-muted-foreground" aria-hidden="true" /> Activity log</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
              {auditRows.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 text-[0.9375rem]">
                  <span><span className="font-medium">{a.actor ?? (a.action.startsWith("doctor.") ? "" : "Someone with a link")}</span> {AUDIT_LABEL[a.action] ?? a.action}{typeof a.detail.member === "string" ? ` · ${a.detail.member}` : typeof a.detail.label === "string" ? ` · ${a.detail.label}` : ""}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
