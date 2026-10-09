# Pulse · Family health, in one place

One place for a family to manage everyone's health: records, medicines, appointments and emergency info, with role-based access for each member.

Built for three kinds of people: the tech-savvy adult who runs the family's health, elderly parents with low tech confidence, and caregivers who need limited access.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui on Base UI · lucide-react · Recharts (shadcn charts) · Drizzle ORM + PostgreSQL · nodemailer · Gemini (optional) · Vitest + Playwright.

## Quick start

```bash
bun install
cp .env.example .env            # set DATABASE_URL, ENCRYPTION_KEY (openssl rand -hex 32), CRON_SECRET
# Postgres: any local or hosted instance, e.g.
docker run -d --name pulse-db -e POSTGRES_USER=pulse -e POSTGRES_PASSWORD=pulse -e POSTGRES_DB=pulse -p 5432:5432 postgres:16-alpine
bun run setup                   # migrate + seed the demo family
bun run dev                     # http://localhost:3000
```

### Demo family (synthetic data), password `demo1234`

| Person | Email | Role | What to show |
| --- | --- | --- | --- |
| Rahul Mehta, 39 | rahul@pulse.demo | **Admin** | Everything, the View-as switcher and the permissions matrix |
| Priya Mehta, 36 | priya@pulse.demo | **Caregiver** | Manages Papa, Maa and Aarav only |
| Suresh Mehta, 68 | suresh@pulse.demo | **Member** | Sees only his own profile |
| Kamala Mehta, 65 | kamala@pulse.demo | **Viewer** | Read-only everywhere |
| Aarav Mehta, 9 | (no login) | | Managed by the family; peanut allergy on the emergency card |

| Dr. Anjali Deshpande | anjali@pulse.demo | **Doctor** | Doctor portal: patients Suresh and Aarav shared with her, notes, connect code `ANJ7DQ` |
| Dr. Farah Khan | farah@pulse.demo | **Doctor** | Sees Suresh through a booking (access ends 7 days after the visit) |

The sign-in page has one-tap buttons for each. The seed has 60 days of history so the progress chart shows Suresh's numbers before and after his care plan started 6 weeks ago.

## Features

| Area | What it does |
| --- | --- |
| Sign-in / sign-up | Split layout, email + password (bcrypt, hashed session tokens), consent captured at sign-up, invite code join |
| Onboarding | 4-step stepper: create or join a family, about you, add members, set roles |
| Family dashboard | Member cards (age, blood group, health snapshot, today's doses), alerts (missed dose, abnormal vital, refill, interaction), today's checklist, appointments, quick actions |
| Member profile | Tabs: Overview, Vitals (BP/sugar/weight charts with normal-range bands, table view), Medicines (adherence, 14-day taken/missed log, clashes), Records, Appointments |
| Medicines | Morning/afternoon/night checklist, add/edit with schedule presets, refill countdown, **interaction checker + generic alternatives**, "check before you buy", read aloud |
| Appointments | List and calendar views, add manually, **doctor booking with live slots and video teleconsult links** |
| Records | Drag-and-drop upload with preview, filter by person/type/date, timeline, **AES-256-GCM encryption at rest**, **AI prescription scanner** |
| Emergency card | High-contrast, printable, shareable; blood group and allergies first; QR code to a public, revocable link; read aloud |
| Symptom check | **Red-flag rules run before AI** (chest pain + sweating = emergency, stroke signs, low SpO₂, self-harm → Tele-MANAS 14416). AI can only raise the level, never lower it; diagnosis-like output is discarded. **Voice input in 10 Indian languages** |
| Family settings | Members, roles, caregiver assignments, invites (email via nodemailer or WhatsApp), **roles × actions permissions matrix**, time-limited share links with view counts, activity log, account and email preferences, data export |
| **Streaks and rewards** | Daily fruit quests (medicines, a reading, water, walk, fruit & veg, sleep). 3 quests keep the streak alive, 2 rest days a week pause it. XP, levels from Seed to Harvest hero, 12 badges, a fruit basket and a friendly family leaderboard. Confetti respects reduced motion |
| **Progress: is it working?** | Rule-based personalised care plan per person (conditions, age, readings). Weekly health score (40% medicines, 35% readings in range, 25% habit goals) plus BP, fasting sugar and weight, charted with a "Plan started" line and before/after averages |
| **PCOS care** | Starts from the doctor's prescription, then an 8-question quiz that picks a lifestyle pattern (insulin-led, inflammatory, adrenal, post-pill). Daily protocol checklist, period log with your own rhythm (no 28-day pressure), symptom heatmap, meal logger with gentle feedback, support numbers |
| **Doctor accounts** | Doctors sign up at `/sign-up?as=doctor` (registration number + declaration). They get a 6-character connect code; families share one person for 1–12 months with consent, and booking a visit shares that person until 7 days after it. The doctor portal shows today's visits, shared patients (medicines, clashes, vitals, records) and lets them leave notes the family sees and gets emailed about. Families can remove access any time |
| Notifications | In-app bell + email (nodemailer): dose-time reminders, missed-dose alerts to caregivers, abnormal readings, refills, next-day appointments, 7 am family summary |

### Role-based access

`lib/permissions.ts` is the single source of truth, shared by server and client. Every Server Action and route handler calls `requireCan()`; the UI uses the same function only to hide/disable controls and show a tooltip explaining why. Admins can preview any role with **View as**: the server then applies that role for real.

| | Admin | Caregiver | Member | Viewer |
| --- | --- | --- | --- | --- |
| Scope | Everyone | Assigned people + self | Own profile | Everyone |
| Default | Everything | View + update meds, doses, vitals, appointments, records | Manage own profile | Read only |

Admins change the defaults in **Family settings → Roles & permissions**. The admin row and "manage family" are locked; viewer write actions can never be enabled.

## Notifications and cron

- `GET /api/cron/reminders` every 15 min: dose reminders, missed doses, refills, appointments.
- `GET /api/cron/daily` at 7:00 IST: morning summary per person (respecting their role's scope) + a reminder sweep.
- Both require `Authorization: Bearer $CRON_SECRET`. On Vercel, `vercel.json` schedules the daily one (Hobby plans allow daily crons only) and `.github/workflows/reminders.yml` calls the 15-minute one.
- Self-hosting: set `LOCAL_CRON=1` and the Next.js server runs the sweep every 5 minutes (`instrumentation.ts`).
- Every notification has a dedupe key, so running jobs more often is safe.
- Admins can trigger a run from **Settings → Account → Run reminder check now**.

Email transport (`lib/mailer.ts`): `SMTP_URL` or `SMTP_HOST/PORT/USER/PASS` for real email; `MAIL_TRANSPORT=ethereal` for a free test inbox with preview links; otherwise emails are rendered and logged to the `email_log` table.

## AI

Gemini is optional (`GEMINI_API_KEY`). Without it the prescription scanner shows a clearly labelled sample, and triage uses the safety rules only. All AI output is JSON validated with zod; the triage prompt forbids diagnoses and medicine names, and a post-filter drops anything that reads like one.

## Deploying to Vercel

1. **Database.** Create a Postgres database, e.g. Neon from the Vercel Marketplace (it sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you), or Supabase (use the pooled URL on port 6543 as `DATABASE_URL` and the direct URL as `DATABASE_URL_UNPOOLED`).
2. **Import the repo** in Vercel. `vercel.json` sets the install and build commands; each build runs `db:migrate` before `next build`.
3. **Environment variables** (Project → Settings → Environment Variables):
   - Required: `DATABASE_URL`, `ENCRYPTION_KEY` (`openssl rand -hex 32`; keep it forever, since changing it makes stored files unreadable), `CRON_SECRET` (any long random string)
   - Recommended: `APP_URL` (your production URL, used in emails, QR codes and share links; falls back to the Vercel production domain), `MAIL_FROM` plus `SMTP_URL` or `SMTP_HOST/PORT/USER/PASS`
   - Optional: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`
4. **Reminders.** In GitHub → Settings → Secrets and variables → Actions, add `APP_URL` and `CRON_SECRET` (same value as in Vercel). The "Reminder sweep" workflow then runs every 15 minutes; trigger it once by hand from the Actions tab to check it works.
5. **Demo data (optional).** Run `bun run db:seed` locally with `DATABASE_URL` pointing at the production database. Skip this for real use.

Limits to know about: uploads are capped at 4 MB because Vercel rejects request bodies over 4.5 MB (large phone photos are shrunk in the browser first). `LOCAL_CRON` does nothing on Vercel. GitHub pauses scheduled workflows after 60 days without repository activity.

## Privacy basics

- Consent at sign-up and for every share link
- Record files encrypted with AES-256-GCM (`lib/crypto.ts`); file type checked by magic bytes; served only to members whose role allows it
- Time-limited, revocable share links with view counts
- Session tokens stored hashed (SHA-256), httpOnly cookies
- Audit log of role, record and sharing changes; JSON data export for admins

## Scripts

| Script | |
| --- | --- |
| `bun run dev` / `build` / `start` | Next.js |
| `bun run setup` | Migrate and seed |
| `bun run db:seed` | Reset to the demo family (dates are relative to today) |
| `bun run test` | Unit tests (permissions, triage rules, drug interactions, schedules, vitals, crypto, slots, prescription parsing) |
| `bun run test:e2e` | Playwright end-to-end tests against the running app (reseeds the DB) |
| `bun run lint` / `typecheck` | ESLint / tsc |

## Where things live

```
app/(auth)            sign-in, sign-up (split layout)
app/onboarding        stepper
app/(app)/…           dashboard, members/[id], medications, appointments, records, emergency, triage, settings
app/share/[token]     public, time-limited emergency card / doctor summary
app/api               record files, cron jobs, data export
app/actions           Server Actions (all permission-checked)
components/health     MemberCard, VitalChart, DoseItem, RoleGate, StatusBadge, EmptyState, SafetyNote…
lib/                  permissions, triage rules, drugs, meds, vitals, crypto, mailer, jobs, mock-data
db/                   Drizzle schema, migrations, seed
```

See `DESIGN.md` for the design system.

> Pulse organises family health information. It is not a diagnosis. Consult a doctor. In an emergency call 112.
