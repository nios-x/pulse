# Architecture

A deep dive into how Pulse is structured, how data flows, and why certain decisions were made.

---

## Table of contents

- [High-level overview](#high-level-overview)
- [Technology choices](#technology-choices)
- [Application layers](#application-layers)
- [Routing and page structure](#routing-and-page-structure)
- [Authentication and sessions](#authentication-and-sessions)
- [Role-based access control](#role-based-access-control)
- [Database schema](#database-schema)
- [Server Actions](#server-actions)
- [Data flow](#data-flow)
- [Encryption and privacy](#encryption-and-privacy)
- [Notification system](#notification-system)
- [AI integration](#ai-integration)
- [Triage safety layer](#triage-safety-layer)
- [Gamification engine](#gamification-engine)
- [Doctor portal](#doctor-portal)
- [Component architecture](#component-architecture)
- [Design system](#design-system)
- [Testing strategy](#testing-strategy)
- [Deployment topology](#deployment-topology)

---

## High-level overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                       │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │
│  │  Auth  │ │Dashboard │ │ Members  │ │ Doctor │ │  Share   │ │
│  │  Flow  │ │  + Shell │ │ + Tabs   │ │ Portal │ │ (Public) │ │
│  └───┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘ │
│      │           │            │            │           │       │
│      ▼           ▼            ▼            ▼           ▼       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Server Actions (app/actions/)              │   │
│  │         Every action calls requireCan() first           │   │
│  └──────────────────────┬──────────────────────────────────┘   │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 16 Server                           │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ context  │ │permissions │ │  crypto  │ │  triage engine  │ │
│  │ (cache)  │ │ (pure fn)  │ │ AES-GCM  │ │ rules → AI      │ │
│  └────┬─────┘ └────────────┘ └──────────┘ └─────────────────┘ │
│       │                                                        │
│  ┌────▼─────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM (typed queries)                 │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │              Route Handlers (app/api/)                   │  │
│  │         /cron/reminders  /cron/daily  /records  /export  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │     PostgreSQL        │
              │  (26 tables, enums,   │
              │   bytea for files)    │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   External Services   │
              │  SMTP · Gemini API    │
              └───────────────────────┘
```

Pulse is a **server-rendered Next.js 16 application** with no separate backend. Data mutations happen through Server Actions, background work through cron-triggered Route Handlers, and all state lives in PostgreSQL.

---

## Technology choices

| Layer | Technology | Why |
| --- | --- | --- |
| Framework | Next.js 16, App Router | Server Components for fast initial paint; Server Actions for mutations without REST boilerplate |
| Language | TypeScript (strict) | End-to-end type safety from DB schema to component props |
| Styling | Tailwind CSS v4 + CSS variables | Design tokens in `globals.css`, no hex values in components |
| Components | shadcn/ui on Base UI + lucide-react | Accessible primitives, tree-shakeable icons |
| Charts | Recharts (shadcn charts) | Vital trend lines with normal-range bands |
| Database | PostgreSQL + Drizzle ORM | Relational model fits family → member → records hierarchy; Drizzle gives typed queries and generated migrations |
| Auth | Custom (bcrypt + SHA-256 session tokens) | Minimal dependencies; sessions stored hashed, httpOnly cookies |
| Email | nodemailer | SMTP, Ethereal, or log-only — configurable per environment |
| AI | Google Gemini (optional) | Prescription OCR and triage phrasing; never required |
| Validation | zod | Shared schemas between Server Actions and AI output parsing |
| Testing | Vitest (unit) + Playwright (E2E) | Pure logic tests run in < 1s; browser tests validate full flows |
| Package manager | Bun | Fast installs and script execution |

---

## Application layers

The app follows a clear layered architecture with strict dependency rules:

```
┌────────────────────────────────────────────┐
│   Pages & Layouts     (app/**/page.tsx)    │  ← Server Components, call getContext()
├────────────────────────────────────────────┤
│   Components          (components/**)      │  ← Mix of server and client components
├────────────────────────────────────────────┤
│   Server Actions      (app/actions/)       │  ← All mutations; always call requireCan()
├────────────────────────────────────────────┤
│   Domain Logic        (lib/)               │  ← Pure functions + server-only modules
├────────────────────────────────────────────┤
│   Data Access         (db/, lib/data.ts)   │  ← Drizzle queries, no business logic
├────────────────────────────────────────────┤
│   Database            (PostgreSQL)         │  ← Schema defined in db/schema.ts
└────────────────────────────────────────────┘
```

**Key rules:**
- Pages never write to the database directly — they call Server Actions.
- Server Actions always check permissions before touching data.
- `lib/permissions.ts` is pure (no imports from `server-only`) so it can run on both server and client.
- Components import permissions to show/hide controls, but never bypass server enforcement.

---

## Routing and page structure

Next.js App Router organises pages into **route groups**:

| Route group | Purpose | Auth |
| --- | --- | --- |
| `(auth)/` | Sign-in, sign-up with split layout | Public |
| `onboarding/` | 4-step stepper (create/join family → profile → members → roles) | Authenticated, no family yet |
| `(app)/` | Main app shell (sidebar desktop, bottom tabs mobile) | Authenticated + family |
| `doctor/` | Doctor portal (separate layout, different nav) | Authenticated + `isDoctor` |
| `share/[token]/` | Public emergency card or summary | Token-validated, no login |
| `api/` | Route Handlers: cron jobs, record file serving, data export | Bearer token or session |

Every `(app)` page uses a shared layout (`app/(app)/layout.tsx`) that provides the navigation shell. Each page directory includes:
- `page.tsx` — the page content (Server Component)
- `loading.tsx` — skeleton placeholder
- `error.tsx` — error boundary with retry

---

## Authentication and sessions

```
┌──────────┐   email + password    ┌──────────────┐
│  Browser │ ─────────────────────▶│ Server Action │
│          │                       │  (auth.ts)    │
│          │   httpOnly cookie     │               │
│          │◀───────────────────── │  bcrypt verify│
└──────────┘   (token)             │  create row   │
                                   └──────┬───────┘
                                          │
                                   ┌──────▼───────┐
                                   │   sessions   │
                                   │  table       │
                                   │  id = SHA-256│
                                   │  of cookie   │
                                   └──────────────┘
```

**Design decisions:**
- The cookie holds a random token. The database stores only its SHA-256 hash — a database leak does not expose valid sessions.
- Sessions expire after 30 days.
- `getCurrentUser()` is wrapped in React's `cache()` so it runs once per request regardless of how many components call it.
- Passwords are hashed with bcrypt (cost factor 10).
- Doctor accounts have `isDoctor: true` and get redirected to `/doctor` instead of the family dashboard.

---

## Role-based access control

RBAC is the most critical architectural decision. It is implemented as a **pure, shared module** (`lib/permissions.ts`) with server enforcement in `lib/context.ts`.

### The access model

```
                        ┌─────────────────┐
                        │  Family settings │
                        │  (overrides)     │
                        └────────┬────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │        roleAllows(role, action,      │
              │                  overrides)           │
              │                                      │
              │  1. Locked cells → always default     │
              │  2. Override exists → use it          │
              │  3. Otherwise → DEFAULT_PERMISSIONS   │
              └──────────────────┬──────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │        inScope(ctx, memberId)        │
              │                                      │
              │  Admin/Viewer → all members          │
              │  Caregiver → self + assigned          │
              │  Member → self only                   │
              └──────────────────┬──────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │       can(ctx, action, memberId)     │
              │                                      │
              │  roleAllows && inScope               │
              └─────────────────────────────────────┘
```

### Enforcement layers

1. **Server Actions** — every action calls `requireCan(ctx, action, memberId)` before any database write. Throws `ForbiddenError` with a plain-language reason.
2. **Page data** — `getContext()` computes `visibleMembers` (members the current role can see). Pages use `findVisibleMember()` for member lookups.
3. **Client UI** — components import `can()` and `denialReason()` to hide controls, disable buttons, and show tooltips explaining *why* something is locked.

### "View as" mode

Admins can preview another role. This is not a UI-only trick: the server reads a `VIEW_AS_COOKIE`, and if the user is an admin, it applies that role to the `AccessContext` for the entire request.

### Permission overrides

Each family stores a `permissions` JSON column with overrides to the defaults. The admin toggles these in **Settings → Roles & permissions**. Locked cells (the admin row and `family.manage`) cannot be changed. Viewer write actions can never be enabled.

---

## Database schema

26 tables organised into domains:

```
┌─────────────────────────────────────────────────────────────┐
│                         Identity                             │
│  users ──── sessions                                        │
│    │                                                         │
│    ▼                                                         │
│  families ──── members ──── invites                          │
│    │             │                                           │
│    │    ┌────────┼────────────────────────┐                  │
│    │    │        │                        │                  │
│    ▼    ▼        ▼                        ▼                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  Health  │ │ Clinical │ │  Living  │ │   Privacy    │   │
│  │          │ │          │ │          │ │              │   │
│  │ vitals   │ │ meds     │ │ habit_   │ │ share_links  │   │
│  │ records  │ │ dose_logs│ │  logs    │ │ doctor_access│   │
│  │          │ │ doctors  │ │ care_    │ │ audit_log    │   │
│  │          │ │ appts    │ │  plans   │ │ notifications│   │
│  │          │ │ triage_  │ │ grace_   │ │ email_log    │   │
│  │          │ │  sessions│ │  days    │ │              │   │
│  │          │ │ doctor_  │ │          │ │              │   │
│  │          │ │  notes   │ │          │ │              │   │
│  │          │ │ doctor_  │ │          │ │              │   │
│  │          │ │  access  │ │          │ │              │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                     PCOS Module                       │   │
│  │  pcos_profiles · cycle_logs · symptom_logs ·          │   │
│  │  protocol_logs · food_logs                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key design choices:**
- **Member ≠ User.** A `member` is a health profile (e.g. a 9-year-old child). A `user` is a login account. Members may or may not have a linked user.
- **Encrypted file storage.** `records.file_data` is a `bytea` column holding `iv (12) | auth tag (16) | ciphertext`. Files never touch disk in plaintext.
- **Derived gamification.** Streaks, XP, levels and badges are computed from `dose_logs`, `vitals`, and `habit_logs` at read time. There is no points ledger that can drift.
- **Deduplicated notifications.** Each notification has a unique `dedupe_key` so cron jobs are idempotent.
- **Typed JSON columns.** Allergies, conditions, emergency contacts, permission overrides, care plan items and PCOS answers are all `jsonb` with TypeScript types via `$type<>()`.

### Enums

The schema defines 12 PostgreSQL enums: `role`, `relation`, `sex`, `dose_status`, `vital_kind`, `appointment_mode`, `appointment_status`, `record_type`, `share_scope`, `triage_level`, `severity`, `habit_kind`, `pcos_phenotype`.

---

## Server Actions

All mutations are Server Actions in `app/actions/`. Each file corresponds to a domain:

| File | Domain | Key actions |
| --- | --- | --- |
| `auth.ts` | Authentication | signIn, signUp, signOut |
| `onboarding.ts` | Onboarding | createFamily, joinFamily, completeOnboarding |
| `family.ts` | Family management | updateFamily, inviteMember, updateRole, togglePermission, deleteFamily |
| `members.ts` | Member profiles | addMember, updateMember, deleteMember |
| `medications.ts` | Medicines | addMedication, updateMedication, deleteMedication |
| `doses.ts` | Dose logging | logDose, batchLogDoses |
| `vitals.ts` | Vital readings | logVital, deleteVital |
| `appointments.ts` | Appointments | createAppointment, updateAppointment, cancelAppointment, bookSlot |
| `records.ts` | Health records | uploadRecord, deleteRecord |
| `scan.ts` | Prescription scanner | scanPrescription (AI) |
| `share.ts` | Sharing | createShareLink, revokeShareLink |
| `triage.ts` | Symptom check | runTriage |
| `habits.ts` | Habit tracking | logHabit, useGraceDay |
| `pcos.ts` | PCOS care | savePcosProfile, logCycle, logSymptoms, logProtocol, logFood |
| `doctor.ts` | Doctor actions | registerDoctor, connectDoctor, addDoctorNote, grantAccess, revokeAccess |
| `session.ts` | Session management | setViewAs, clearViewAs |

**Every write action** follows this pattern:

```typescript
"use server";

export async function doSomething(formData: FormData) {
  const ctx = await getContext();           // loads user, family, role
  requireCan(ctx, "some.action", memberId); // throws ForbiddenError if denied
  const input = schema.parse(/* … */);      // zod validation
  await db.insert(…).values(…);            // database write
  revalidatePath(…);                        // refresh cached pages
}
```

---

## Data flow

### Read path (page render)

```
Browser GET /dashboard
    │
    ▼
layout.tsx → getContext() [cached per request]
    │          ├── requireUser() → reads session cookie → DB lookup
    │          ├── loads family + all members
    │          ├── reads VIEW_AS cookie
    │          └── builds AccessContext (role, scope, overrides)
    │
    ▼
page.tsx → queries DB (filtered by visibleMembers)
    │
    ▼
Server Component tree renders → streams HTML to browser
```

### Write path (Server Action)

```
Browser form submit / action call
    │
    ▼
Server Action
    ├── getContext()
    ├── requireCan(ctx, action, memberId)
    ├── zod.parse(input)
    ├── db.insert / update / delete
    ├── revalidatePath()
    └── optional: send email, create notification
    │
    ▼
Browser receives updated page
```

---

## Encryption and privacy

### Record file encryption

```
Upload flow:
  Browser ──▶ Server Action ──▶ magic bytes check ──▶ encrypt(buffer) ──▶ DB (bytea)

Download flow:
  requireCan("records.view") ──▶ DB read ──▶ decrypt(blob) ──▶ stream response

encrypt():
  1. Generate random IV (12 bytes)
  2. AES-256-GCM encrypt with ENCRYPTION_KEY
  3. Store: iv | authTag (16 bytes) | ciphertext

decrypt():
  1. Split blob into iv, authTag, ciphertext
  2. AES-256-GCM decrypt
  3. Verify authenticity (GCM tag)
```

### Share links

Share links are token-based (`/share/[token]`). Each link:
- Is scoped to a single member and a scope (`emergency`, `summary`, or `records`)
- Has an expiry timestamp
- Tracks view count and last viewed time
- Can be revoked instantly by the family
- Requires no login to view

### Session security

- Cookie token is a random `base64url` string (32 bytes)
- Database stores only the SHA-256 hash
- `httpOnly`, `sameSite: lax`, `secure` in production
- 30-day expiry

---

## Notification system

```
┌───────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Cron trigger │────▶│   lib/jobs.ts    │────▶│ notifications  │
│               │     │                  │     │   table        │
│ • /api/cron/  │     │ • dose reminders │     └───────┬────────┘
│   reminders   │     │ • missed alerts  │             │
│   (15 min)    │     │ • refill warns   │     ┌───────▼────────┐
│               │     │ • appointment    │     │  lib/mailer.ts │
│ • /api/cron/  │     │   reminders      │     │                │
│   daily       │     │ • daily digest   │     │ • SMTP send    │
│   (7am IST)   │     │                  │     │ • Ethereal     │
│               │     │ Dedupe key per   │     │ • Log-only     │
│ • LOCAL_CRON  │     │ notification     │     │                │
│   (5 min,     │     │                  │     │ email_log      │
│   in-process) │     └──────────────────┘     └────────────────┘
└───────────────┘
```

**Three trigger mechanisms:**
1. **Vercel cron** — `vercel.json` schedules `/api/cron/daily` once per day.
2. **GitHub Actions** — `.github/workflows/reminders.yml` calls `/api/cron/reminders` every 15 minutes.
3. **In-process** — `instrumentation.ts` runs both jobs every 5 minutes when `LOCAL_CRON=1`.

All three are safe to overlap because every notification has a `dedupe_key`.

**Email transport** is configurable:
- `SMTP_URL` or `SMTP_HOST/PORT/USER/PASS` → real delivery
- `MAIL_TRANSPORT=ethereal` → free test inbox with preview URLs
- No config → renders the email and writes it to `email_log` + console

---

## AI integration

AI is **strictly optional**. The app is fully functional without a `GEMINI_API_KEY`.

```
┌─────────────────────────────────────────────────────┐
│                   With API key                       │
│                                                      │
│  Prescription scan:                                  │
│    photo → Gemini vision → zod parse → structured    │
│    JSON (medicine name, dose, frequency, duration)   │
│                                                      │
│  Triage phrasing:                                    │
│    symptoms → safety rules first → Gemini for        │
│    wording → post-filter → zod validate              │
│    (AI can only raise severity, never lower it;      │
│     anything resembling a diagnosis is dropped)      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Without API key                     │
│                                                      │
│  Prescription scan:                                  │
│    shows a clearly labelled sample result            │
│                                                      │
│  Triage:                                             │
│    uses deterministic red-flag rules only             │
└─────────────────────────────────────────────────────┘
```

**Safety constraints on AI output:**
- Triage prompt forbids diagnoses and medicine names
- Post-filter regex drops anything that reads like a diagnosis
- All AI output is validated with zod schemas — malformed responses are rejected
- AI can only *raise* the triage level (e.g. self-care → urgent), never lower what the rules engine determined
- Fallback model chain handles rate limits (`GEMINI_FALLBACK_MODELS`)

---

## Triage safety layer

The triage system has a two-stage design where **safety rules always run first**:

```
User input (symptoms, age, sex, vitals)
    │
    ▼
┌──────────────────────────────────────┐
│  Stage 1: Deterministic rules        │
│  (lib/triage/rules.ts)               │
│                                      │
│  Red-flag patterns:                  │
│  • Chest pain + sweating → emergency │
│  • Stroke signs (FAST)  → emergency  │
│  • SpO₂ < 92%           → emergency  │
│  • Self-harm ideation    → crisis    │
│    (Tele-MANAS 14416)               │
│                                      │
│  → Assigns: triage level + red flags │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Stage 2: AI phrasing (optional)     │
│  (lib/triage/engine.ts + lib/ai.ts)  │
│                                      │
│  • Only adds natural-language advice │
│  • Can only raise the level          │
│  • Post-filter drops diagnoses       │
│  • Validated with zod                │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Result                              │
│  • Level: emergency|urgent|doctor|   │
│           self_care                  │
│  • Red flags (array)                │
│  • Source: rules | ai | rules+ai    │
│  • Saved to triage_sessions table   │
└──────────────────────────────────────┘
```

---

## Gamification engine

Gamification is derived entirely from real health data. There is **no points ledger** — everything is computed at read time from `dose_logs`, `vitals`, `habit_logs`, and `grace_days`.

```
lib/gamification.ts
    │
    ├── computeStreak(logs, graceDays)
    │   └── 3+ quests/day = streak day; 2 rest days/week allowed
    │
    ├── computeXP(logs)
    │   └── doses + vitals + habits = XP
    │
    ├── computeLevel(xp)
    │   └── Seed → Sprout → Sapling → Bloom → Harvest hero
    │
    ├── computeBadges(logs, streak, level)
    │   └── 12 badges unlocked by milestones
    │
    └── computeQuests(member, date, logs)
        └── 6 daily quests: meds, reading, water, walk, fruit & veg, sleep

lib/game-data.ts
    └── QUEST_ICON map: each quest → one lucide icon (pill, heart-pulse, etc.)
```

**Design philosophy:** the tool should feel like a health record, not a game. Missed days are never shamed. Rest days protect a streak. Badge colour is brand only.

---

## Doctor portal

Doctors have their own authentication path and a separate portal:

```
Doctor sign-up (/sign-up?as=doctor)
    │
    ├── registration number + declaration
    ├── users.isDoctor = true
    ├── doctors table entry
    └── auto-generated connect code (e.g. "ANJ7DQ")

Family connects doctor:
    │
    ├── Type connect code in family settings
    ├── Choose member to share + duration (1–12 months)
    ├── Consent captured
    └── doctor_access row created

Doctor portal (/doctor):
    │
    ├── Today's visits (from appointments)
    ├── Shared patients:
    │   ├── Medicines + clashes
    │   ├── Vitals
    │   └── Records
    ├── Doctor notes (visible to family, emailed)
    └── Profile settings
```

**Access control:** `doctor_access` has an `expiresAt` timestamp. Booking a visit automatically creates access that expires 7 days after the appointment. Families can revoke access at any time.

---

## Component architecture

Components are organised by domain, not by type:

```
components/
├── health/         Domain-specific, reusable across pages
│   ├── MemberCard          family dashboard card
│   ├── MemberAvatar        coloured initials
│   ├── VitalChart          recharts line + normal-range band
│   ├── VitalDialog         add/view vital reading
│   ├── DoseItem / DoseList medicine checklist items
│   ├── RoleGate            hides/disables based on role, shows tooltip
│   ├── RoleBadge           coloured role label
│   ├── StatusBadge         icon + word, never colour alone
│   ├── EmptyState          illustration-free, with primary action
│   ├── SafetyNote          "Not a diagnosis" disclaimer
│   ├── PageHeader          consistent page title + breadcrumb
│   ├── EmergencyCard       high-contrast, printable
│   └── …
├── game/           Gamification widgets
│   ├── QuestList           daily quests with ±buttons
│   ├── StreakFlame          static flame icon + count
│   ├── LevelProgress       name, level bar, XP
│   ├── WeekStrip           7-day streak calendar
│   └── BadgeGrid           earned/locked badges
├── shell/          App frame
│   ├── Sidebar             desktop navigation
│   └── BottomTabs          mobile navigation
├── ui/             Base primitives (shadcn/ui on Base UI)
│   ├── Button, Dialog, Card, Popover, Calendar…
│   └── (design token consumers, no domain logic)
├── form/           Form primitives
│   └── Field, Select, DatePicker…
├── voice/          Speech input
├── brand/          ShaderBackground (WebGL mesh gradient)
└── providers/      React context providers
```

**Key component: `RoleGate`** — wraps any control and:
1. Calls `can()` to check the current role
2. If denied: renders a `<Lock>` icon, disables the control, shows a tooltip with `denialReason()`
3. Remains keyboard-focusable for accessibility

---

## Design system

The design system is documented in `DESIGN.md`. Key architectural points:

- **All tokens** are CSS variables in `app/globals.css` (`:root` for light, `.dark` for dark mode), exposed to Tailwind via `@theme inline`.
- **Components never use hex values.** All colours come from tokens.
- **Status is never colour-only.** `StatusBadge` always pairs an icon with a word.
- **44px minimum touch targets.** Critical for elderly users.
- **`prefers-reduced-motion`** turns off all animations including the WebGL background.
- **Typography:** Plus Jakarta Sans for headings, Geist for body. Body 16px, minimum 14px for meta text.

---

## Testing strategy

### Unit tests (Vitest)

Pure logic modules are tested in isolation. The test suite covers:

| Module | What's tested |
| --- | --- |
| `permissions.ts` | Role checks, scope rules, overrides, locked cells, denial reasons |
| `triage/rules.ts` | Red-flag pattern matching, severity escalation |
| `drugs.ts` | Drug interaction detection, generic alternative lookup |
| `meds.ts` | Schedule computation, refill countdown, adherence calculation |
| `vitals.ts` | Normal range evaluation, status classification |
| `crypto.ts` | Encrypt → decrypt round-trip, key derivation |
| `slots.ts` | Appointment slot generation from doctor hours |
| `prescription.ts` | Text parsing for medicine extraction |
| `gamification.ts` | Streak calculation, XP, levels, badge unlocks |
| `health-score.ts` | Weekly score computation |
| `pcos.ts` | Phenotype classification from quiz answers |

### E2E tests (Playwright)

Browser tests run against the full app:
- Auth flows (sign-in, sign-up)
- Dashboard rendering and navigation
- Dose logging
- Role-based visibility

The E2E suite reseeds the database before each run via `tests/global-setup.ts`.

---

## Deployment topology

### Vercel (recommended)

```
┌────────────────────────────────────────────────────┐
│  Vercel                                            │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  Next.js (serverless functions)              │  │
│  │  • Pages (server-rendered)                   │  │
│  │  • Server Actions                            │  │
│  │  • Route Handlers                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  vercel.json cron: /api/cron/daily @ 01:30 UTC     │
│                                                    │
│  Headers: X-Content-Type-Options, Referrer-Policy, │
│           Permissions-Policy (camera, microphone)   │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  GitHub Actions                                    │
│  reminders.yml: /api/cron/reminders every 15 min   │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  PostgreSQL (Neon / Supabase / any)                │
└────────────────────────────────────────────────────┘
```

### Self-hosted

```
┌────────────────────────────────────────────────────┐
│  Node.js server                                    │
│                                                    │
│  next start (or bun run start)                     │
│  LOCAL_CRON=1 → in-process scheduler               │
│  (instrumentation.ts: 5-min sweep + 7am digest)    │
│                                                    │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│  PostgreSQL                                        │
└────────────────────────────────────────────────────┘
```

**Limits:**
- Upload cap: 4 MB (Vercel's 4.5 MB body limit minus form overhead; large photos shrunk client-side)
- `LOCAL_CRON` is ignored on Vercel
- GitHub Actions pauses scheduled workflows after 60 days without repo activity
