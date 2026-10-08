import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { LifeBuoyIcon } from "lucide-react";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { AppShell } from "@/components/shell/app-shell";
import { CallList } from "@/components/safety/call-list";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { HELPLINES, safetyText } from "@/lib/safety";

/** "Need help now": reachable from the menu on every screen. */
export default async function HelpPage() {
  const user = await requireUser();
  const { t, locale } = await getT();

  // Everyone in my families who has a phone number, except me.
  const mine = alias(memberships, "mine");
  const family = await db
    .selectDistinct({ name: users.name, phone: users.phone })
    .from(memberships)
    .innerJoin(mine, and(eq(mine.patientId, memberships.patientId), eq(mine.userId, user.id)))
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(ne(users.id, user.id), isNotNull(users.phone), inArray(memberships.role, ["owner", "caregiver", "family"])));

  return (
    <AppShell patient={null}>
      <div className="flex flex-col gap-5">
        <LifeBuoyIcon className="size-12 text-destructive" aria-hidden />
        <h1 className="text-3xl font-bold">{safetyText("help_title", locale)}</h1>
        <p className="text-lg leading-snug">{safetyText("help_body", locale)}</p>
        <CallList
          items={[
            { label: t("help.call112"), number: HELPLINES.emergency, primary: true },
            { label: t("help.call108"), number: HELPLINES.ambulance, primary: true },
            { label: t("help.callTeleManas"), number: HELPLINES.teleManas, hint: t("help.teleManasHint") },
            { label: t("help.callTeleManasAlt"), number: HELPLINES.teleManasAlt },
            ...family.map((f) => ({ label: t("alert.call", { name: f.name }), number: f.phone! })),
          ]}
        />
      </div>
    </AppShell>
  );
}
