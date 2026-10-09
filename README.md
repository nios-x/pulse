# Pulse · Family health, in one place

One place for a family to manage everyone's health: records, medicines, appointments and emergency info, with role-based access for each member.

Built for three kinds of people: the tech-savvy adult who runs the family's health, elderly parents with low tech confidence, and caregivers who need limited access.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui on Base UI · lucide-react · Recharts (shadcn charts) · Drizzle ORM + PostgreSQL · nodemailer · Gemini (optional) · Vitest + Playwright.

---

## Table of contents

- [Quick start](#quick-start)
- [Demo family](#demo-family)
- [Features](#features)
- [Role-based access](#role-based-access)
- [Notifications and cron](#notifications-and-cron)
- [AI](#ai)
- [Deploying to Vercel](#deploying-to-vercel)
- [Privacy and security](#privacy-and-security)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Quick start

```bash
bun install
cp .env.example .env            # set DATABASE_URL, ENCRYPTION_KEY (openssl rand -hex 32), CRON_SECRET
# Postgres: any local or hosted instance, e.g.
docker run -d --name pulse-db -e POSTGRES_USER=pulse -e POSTGRES_PASSWORD=pulse -e POSTGRES_DB=pulse -p 5432:5432 postgres:16-alpine
bun run setup                   # migrate + seed the demo family
bun run dev                     # http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string |
| `ENCRYPTION_KEY` | ✅ | 64 hex characters (`openssl rand -hex 32`). Encrypts record files — changing it makes stored files unreadable |
| `CRON_SECRET` | ✅ | Bearer token for `/api/cron/*` endpoints |
| `APP_URL` | Recommended | Public URL used in emails, QR codes and share links (falls back to Vercel domain) |
| `MAIL_FROM` | Recommended | Sender address for outbound email |
| `SMTP_URL` or `SMTP_HOST/PORT/USER/PASS` | Optional | SMTP transport. Without it, emails render to the `email_log` table |
| `MAIL_TRANSPORT=ethereal` | Optional | Free test inbox with preview links |
| `GEMINI_API_KEY` | Optional | Enables prescription scanner and AI triage phrasing |
| `GEMINI_MODEL` | Optional | Override the default Gemini model |
| `GEMINI_FALLBACK_MODELS` | Optional | Comma-separated fallback models for rate limits |
| `LOCAL_CRON=1` | Optional | Runs the reminder sweep every 5 minutes in-process (self-hosting) |

---

## Demo family

Synthetic data, password `demo1234` for all accounts.

| Person | Email | Role | What to show |
| --- | --- | --- | --- |
| Rahul Mehta, 39 | rahul@pulse.demo | **Admin** | Everything, the View-as switcher and the permissions matrix |
| Priya Mehta, 36 | priya@pulse.demo | **Caregiver** | Manages Papa, Maa and Aarav only |
| Suresh Mehta, 68 | suresh@pulse.demo | **Member** | Sees only his own profile |
| Kamala Mehta, 65 | kamala@pulse.demo | **Viewer** | Read-only everywhere |
| Aarav Mehta, 9 | (no login) | | Managed by the family; peanut allergy on the emergency card |

| Doctor | Email | Connect code | Access |
| --- | --- | --- | --- |
| Dr. Anjali Deshpande | anjali@pulse.demo | `ANJ7DQ` | Patients Suresh and Aarav shared with her, notes |
| Dr. Farah Khan | farah@pulse.demo | | Sees Suresh through a booking (access ends 7 days after the visit) |

The sign-in page has one-tap buttons for each. The seed includes 60 days of history so the progress chart shows Suresh's numbers before and after his care plan started 6 weeks ago.

---

## Features

| Area | What it does |
| --- | --- |
| **Sign-in / sign-up** | Split layout, email + password (bcrypt, hashed session tokens), consent captured at sign-up, invite code join |
| **Onboarding** | 4-step stepper: create or join a family, about you, add members, set roles |
| **Family dashboard** | Member cards (age, blood group, health snapshot, today's doses), alerts (missed dose, abnormal vital, refill, interaction), today's checklist, appointments, quick actions |
| **Member profile** | Tabs: Overview, Vitals (BP/sugar/weight charts with normal-range bands, table view), Medicines (adherence, 14-day taken/missed log, clashes), Records, Appointments |
| **Medicines** | Morning/afternoon/night checklist, add/edit with schedule presets, refill countdown, **interaction checker + generic alternatives**, "check before you buy", read aloud |
| **Appointments** | List and calendar views, add manually, **doctor booking with live slots and video teleconsult links** |
| **Records** | Drag-and-drop upload with preview, filter by person/type/date, timeline, **AES-256-GCM encryption at rest**, **AI prescription scanner** |
| **Emergency card** | High-contrast, printable, shareable; blood group and allergies first; QR code to a public, revocable link; read aloud |
| **Symptom check** | **Red-flag rules run before AI** (chest pain + sweating = emergency, stroke signs, low SpO₂, self-harm → Tele-MANAS 14416). AI can only raise the level, never lower it; diagnosis-like output is discarded. **Voice input in 10 Indian languages** |
| **Family settings** | Members, roles, caregiver assignments, invites (email via nodemailer or WhatsApp), **roles × actions permissions matrix**, time-limited share links with view counts, activity log, account and email preferences, data export |
| **Streaks & rewards** | Daily fruit quests (medicines, a reading, water, walk, fruit & veg, sleep). 3 quests keep the streak alive, 2 rest days a week pause it. XP, levels from Seed to Harvest hero, 12 badges, a fruit basket and a friendly family leaderboard |
| **Progress** | Rule-based personalised care plan per person (conditions, age, readings). Weekly health score (40% medicines, 35% readings in range, 25% habit goals) plus BP, fasting sugar and weight, charted with a "Plan started" line and before/after averages |
| **PCOS care** | Starts from the doctor's prescription, then an 8-question quiz that picks a lifestyle pattern (insulin-led, inflammatory, adrenal, post-pill). Daily protocol checklist, period log with your own rhythm, symptom heatmap, meal logger with gentle feedback, support numbers |
| **Doctor accounts** | Doctors sign up at `/sign-up?as=doctor` (registration number + declaration). They get a 6-character connect code; families share one person for 1–12 months with consent, and booking a visit shares that person until 7 days after it. The doctor portal shows today's visits, shared patients (medicines, clashes, vitals, records) and lets them leave notes the family sees and gets emailed about. Families can remove access any time |
| **Notifications** | In-app bell + email (nodemailer): dose-time reminders, missed-dose alerts to caregivers, abnormal readings, refills, next-day appointments, 7 am family summary |

---

## Role-based access

`lib/permissions.ts` is the single source of truth, shared by server and client. Every Server Action and route handler calls `requireCan()`; the UI uses the same function only to hide/disable controls and show a tooltip explaining why. Admins can preview any role with **View as**: the server then applies that role for real.

| | Admin | Caregiver | Member | Viewer |
| --- | --- | --- | --- | --- |
| **Scope** | Everyone | Assigned people + self | Own profile | Everyone |
| **Default** | Everything | View + update meds, doses, vitals, appointments, records | Manage own profile | Read only |

Admins change the defaults in **Family settings → Roles & permissions**. The admin row and "manage family" are locked; viewer write actions can never be enabled.

---

## Notifications and cron

- `GET /api/cron/reminders` every 15 min: dose reminders, missed doses, refills, appointments.
- `GET /api/cron/daily` at 7:00 IST: morning summary per person (respecting their role's scope) + a reminder sweep.
- Both require `Authorization: Bearer $CRON_SECRET`. On Vercel, `vercel.json` schedules the daily one (Hobby plans allow daily crons only) and `.github/workflows/reminders.yml` calls the 15-minute one.
- Self-hosting: set `LOCAL_CRON=1` and the Next.js server runs the sweep every 5 minutes (`instrumentation.ts`).
- Every notification has a dedupe key, so running jobs more often is safe.
- Admins can trigger a run from **Settings → Account → Run reminder check now**.

Email transport (`lib/mailer.ts`): `SMTP_URL` or `SMTP_HOST/PORT/USER/PASS` for real email; `MAIL_TRANSPORT=ethereal` for a free test inbox with preview links; otherwise emails are rendered and logged to the `email_log` table.

---

## AI

Gemini is optional (`GEMINI_API_KEY`). Without it the prescription scanner shows a clearly labelled sample, and triage uses the safety rules only. All AI output is JSON validated with zod; the triage prompt forbids diagnoses and medicine names, and a post-filter drops anything that reads like one.

---

## Deploying to Vercel

1. **Database.** Create a Postgres database, e.g. Neon from the Vercel Marketplace (it sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you), or Supabase (use the pooled URL on port 6543 as `DATABASE_URL` and the direct URL as `DATABASE_URL_UNPOOLED`).
2. **Import the repo** in Vercel. `vercel.json` sets the install and build commands; each build runs `db:migrate` before `next build`.
3. **Environment variables** (Project → Settings → Environment Variables):
   - Required: `DATABASE_URL`, `ENCRYPTION_KEY` (`openssl rand -hex 32`; keep it forever, since changing it makes stored files unreadable), `CRON_SECRET` (any long random string)
   - Recommended: `APP_URL` (your production URL, used in emails, QR codes and share links; falls back to the Vercel production domain), `MAIL_FROM` plus `SMTP_URL` or `SMTP_HOST/PORT/USER/PASS`
   - Optional: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`
4. **Reminders.** In GitHub → Settings → Secrets and variables → Actions, add `APP_URL` and `CRON_SECRET` (same value as in Vercel). The "Reminder sweep" workflow then runs every 15 minutes; trigger it once by hand from the Actions tab to check it works.
5. **Demo data (optional).** Run `bun run db:seed` locally with `DATABASE_URL` pointing at the production database. Skip this for real use.

**Limits to know about:** uploads are capped at 4 MB because Vercel rejects request bodies over 4.5 MB (large phone photos are shrunk in the browser first). `LOCAL_CRON` does nothing on Vercel. GitHub pauses scheduled workflows after 60 days without repository activity.

---

## Privacy and security

- Consent at sign-up and for every share link
- Record files encrypted with AES-256-GCM (`lib/crypto.ts`); file type checked by magic bytes; served only to members whose role allows it
- Time-limited, revocable share links with view counts
- Session tokens stored hashed (SHA-256), httpOnly cookies
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) on every response
- Audit log of role, record and sharing changes; JSON data export for admins

---

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `bun run setup` | Migrate and seed |
| `bun run db:generate` | Generate Drizzle migrations from schema changes |
| `bun run db:migrate` | Apply pending database migrations |
| `bun run db:seed` | Reset to the demo family (dates are relative to today) |
| `bun run db:studio` | Open Drizzle Studio to browse the database |
| `bun run test` | Unit tests (permissions, triage rules, drug interactions, schedules, vitals, crypto, slots, prescription parsing) |
| `bun run test:e2e` | Playwright end-to-end tests against the running app (reseeds the DB) |
| `bun run lint` / `typecheck` | ESLint / TypeScript type checking |

---

## Project structure

```
pulse/
├── app/
│   ├── (auth)/                 # sign-in, sign-up (split layout)
│   ├── onboarding/             # 4-step stepper
│   ├── (app)/                  # authenticated app shell
│   │   ├── dashboard/          # family dashboard
│   │   ├── members/            # member profiles with tabs
│   │   ├── medications/        # medicine management
│   │   ├── appointments/       # appointment list/calendar
│   │   ├── records/            # encrypted health records
│   │   ├── emergency/          # emergency card
│   │   ├── triage/             # symptom checker
│   │   ├── progress/           # health score & care plans
│   │   ├── pcos/               # PCOS care module
│   │   └── settings/           # family settings, roles, sharing
│   ├── doctor/                 # doctor portal (patients, notes)
│   ├── share/[token]/          # public, time-limited shared views
│   ├── actions/                # Server Actions (all permission-checked)
│   └── api/                    # Route Handlers (cron, export, records)
├── components/
│   ├── health/                 # MemberCard, VitalChart, DoseItem, RoleGate, StatusBadge, EmptyState, SafetyNote…
│   ├── game/                   # QuestList, StreakFlame, LevelProgress, BadgeGrid…
│   ├── meds/                   # medication-specific components
│   ├── pcos/                   # PCOS-specific components
│   ├── doctor/                 # doctor portal components
│   ├── triage/                 # triage UI components
│   ├── brand/                  # ShaderBackground, branding elements
│   ├── voice/                  # speech input components
│   ├── ui/                     # base design-system primitives (shadcn/ui)
│   ├── form/                   # form primitives
│   ├── shell/                  # app shell (sidebar, bottom tabs)
│   └── settings/               # settings page components
├── lib/
│   ├── permissions.ts          # RBAC: single source of truth, shared server + client
│   ├── context.ts              # request context: user, family, role, access
│   ├── auth.ts                 # session management, bcrypt
│   ├── crypto.ts               # AES-256-GCM encryption/decryption
│   ├── triage/                 # red-flag rules engine + AI triage
│   ├── drugs.ts                # interaction checker + generics database
│   ├── vitals.ts               # vital ranges, status evaluation
│   ├── meds.ts                 # medication schedule logic
│   ├── gamification.ts         # streaks, XP, levels, badges (derived from logs)
│   ├── health-score.ts         # weekly health score computation
│   ├── pcos.ts                 # phenotype quiz, protocols, symptom mapping
│   ├── recommendations.ts      # personalised care plan generator
│   ├── jobs.ts                 # cron job logic (reminders, digests)
│   ├── mailer.ts               # nodemailer transport + fallback logging
│   ├── validators.ts           # zod schemas for Server Action inputs
│   └── …                       # alerts, dates, slots, share, QR, AI, labels
├── db/
│   ├── schema.ts               # Drizzle ORM schema (26 tables, typed enums)
│   ├── index.ts                # database connection
│   ├── migrate.ts              # migration runner
│   ├── migrations/             # SQL migration files
│   └── seed.ts                 # demo family seeder
├── tests/
│   ├── e2e/                    # Playwright browser tests
│   └── fixtures/               # test data
├── public/                     # static assets
├── instrumentation.ts          # optional in-process cron scheduler
├── next.config.ts              # Next.js 16 config
├── drizzle.config.ts           # Drizzle Kit config
├── vercel.json                 # Vercel deployment: install, build, crons
└── .github/workflows/          # GitHub Actions: 15-minute reminder sweep
```

See `DESIGN.md` for the design system and `ARCHITECTURE.md` for a deep dive into how the pieces fit together.

---

## Testing

**Unit tests** cover the core logic modules and run with Vitest:

```bash
bun run test
```

Tests cover: permissions and role scoping, triage red-flag rules, drug interaction detection, medication schedule computation, vital range evaluation, AES-256-GCM encrypt/decrypt round-trips, appointment slot generation, prescription text parsing, gamification scoring, health score calculations, and PCOS phenotype classification.

**End-to-end tests** run against the live app with Playwright:

```bash
bun run test:e2e
```

The E2E suite reseeds the database and walks through auth flows, dashboard rendering, dose logging, and navigation.

---

## Contributing

1. Fork and create a feature branch
2. Run `bun run lint && bun run typecheck && bun run test` before committing
3. Every Server Action must call `requireCan()` — no exceptions
4. Never use hex colour values in components; use design tokens from `globals.css`
5. Health status must always pair an icon with a word — never colour alone

---

## License

Private. Not for redistribution.

---

> Pulse organises family health information. It is not a diagnosis. Consult a doctor. In an emergency call 112.
