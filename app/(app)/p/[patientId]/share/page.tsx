import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { labResults, shareLinks } from "@/db/schema";
import { CreateLinkForm, LabForm, RevokeLinkButton } from "@/components/share/share-controls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { istDate } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { now } from "@/lib/now";
import { originUrl } from "@/lib/origin";
import { requirePermission } from "@/lib/permissions";

export default async function SharePage({ params, searchParams }: PageProps<"/p/[patientId]/share">) {
  const { patientId } = await params;
  const { includeMood } = await searchParams;
  const { permissions, patient } = await requirePermission(patientId, "create_share_link");
  const { t, locale } = await getT();
  const today = istDate(await now());

  const [labs, links, origin] = await Promise.all([
    db
      .select({ id: labResults.id, value: labResults.value, takenOn: labResults.takenOn })
      .from(labResults)
      .where(eq(labResults.patientId, patientId))
      .orderBy(desc(labResults.takenOn))
      .limit(6),
    db
      .select({
        id: shareLinks.id,
        token: shareLinks.token,
        expiresAt: shareLinks.expiresAt,
        includeMood: shareLinks.includeMood,
        createdAt: shareLinks.createdAt,
      })
      .from(shareLinks)
      .where(and(eq(shareLinks.patientId, patientId), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, sql`now()`)))
      .orderBy(desc(shareLinks.createdAt)),
    originUrl(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("share.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("share.subtitle", { name: patient.name })}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("share.hba1cTitle")}</CardTitle>
          <CardDescription>{t("share.hba1cHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {labs.length ? (
            <ul className="flex flex-wrap gap-2">
              {labs.map((l) => (
                <li key={l.id} className="rounded-lg bg-muted px-3 py-1.5 text-base">
                  <span className="font-semibold tabular-nums">{l.value}%</span>{" "}
                  <span className="text-sm text-muted-foreground">{formatDay(l.takenOn, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {permissions.log_labs ? <LabForm patientId={patientId} today={today} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("share.linkTitle")}</CardTitle>
          <CardDescription>{t("share.linkHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateLinkForm
            patientId={patientId}
            origin={origin}
            patientName={patient.name}
            canIncludeMood={permissions.view_mood}
            moodDefault={includeMood === "1"}
          />
        </CardContent>
      </Card>

      {links.length ? (
        <section aria-labelledby="links-heading" className="flex flex-col gap-2">
          <h2 id="links-heading" className="text-lg font-semibold">
            {t("share.active")}
          </h2>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <a href={`/share/${l.token}`} target="_blank" rel="noreferrer" className="block truncate font-mono text-sm underline">
                    /share/{l.token.slice(0, 10)}…
                  </a>
                  <p className="text-sm text-muted-foreground">
                    {t("share.expires", { date: formatDay(istDate(l.expiresAt), locale) })}
                    {l.includeMood ? ` · ${t("share.withMood")}` : ""}
                  </p>
                </div>
                <RevokeLinkButton patientId={patientId} linkId={l.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
