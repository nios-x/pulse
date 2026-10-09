# User Workflows

Step-by-step walkthrough of every user-facing flow in Pulse, organised by persona and task. Use this as a reference for demos, testing, onboarding, and feature documentation.

---

## Table of contents

- [Personas](#personas)
- [1. Sign up and sign in](#1-sign-up-and-sign-in)
- [2. Onboarding](#2-onboarding)
- [3. Family dashboard](#3-family-dashboard)
- [4. Member profiles](#4-member-profiles)
- [5. Medicines](#5-medicines)
- [6. Dose logging](#6-dose-logging)
- [7. Drug interactions and generics](#7-drug-interactions-and-generics)
- [8. Prescription scanner](#8-prescription-scanner)
- [9. Vitals](#9-vitals)
- [10. Appointments](#10-appointments)
- [11. Doctor booking](#11-doctor-booking)
- [12. Health records](#12-health-records)
- [13. Emergency card](#13-emergency-card)
- [14. Symptom check (triage)](#14-symptom-check-triage)
- [15. Progress and rewards](#15-progress-and-rewards)
- [16. PCOS care](#16-pcos-care)
- [17. Family settings](#17-family-settings)
- [18. Notifications](#18-notifications)
- [19. Doctor portal](#19-doctor-portal)
- [20. Sharing with a doctor](#20-sharing-with-a-doctor)
- [21. Share links](#21-share-links)
- [22. View-as mode (admin)](#22-view-as-mode-admin)
- [23. Voice and language](#23-voice-and-language)
- [Workflow map](#workflow-map)

---

## Personas

| Persona | Example | Role | How they use Pulse |
| --- | --- | --- | --- |
| **The organiser** | Rahul, 39 | Admin | Sets up the family, manages everyone's health, configures roles and permissions |
| **The caregiver** | Priya, 36 | Caregiver | Looks after Papa, Maa and Aarav — marks doses, books appointments, uploads records for them |
| **The elder** | Suresh, 68 | Member | Sees only his own profile, taps "taken" on his morning medicines, reads aloud feature |
| **The observer** | Kamala, 65 | Viewer | Looks at everyone's health but can't change anything |
| **The child** | Aarav, 9 | (no login) | Has no login — managed entirely by the family |
| **The doctor** | Dr. Anjali | Doctor | Uses a separate portal to see shared patients, review medicines, leave notes |

---

## 1. Sign up and sign in

### New user sign-up

```
Landing page → "Get started" → /sign-up
```

1. Enter **name**, **email** and **password**
2. Read and accept the **privacy consent** (purpose, storage, sharing — DPDP-style)
3. Submit → account created (password hashed with bcrypt)
4. Session cookie set (httpOnly, sameSite, 30-day expiry)
5. Redirect to → **Onboarding** (`/onboarding`)

> **Doctor sign-up:** Append `?as=doctor` to the URL. The form adds a **registration number** and a **declaration** field. On submit, `users.isDoctor = true` and a `doctors` row is created with an auto-generated connect code. Redirects to `/doctor` instead of onboarding.

### Returning user sign-in

```
/sign-in → email + password → dashboard
```

1. Enter email and password
2. Server verifies with bcrypt
3. New session row created (SHA-256 hash of cookie token)
4. Redirect to → `/dashboard` (or `/doctor` for doctor accounts, or `/onboarding` if no family yet)

> **Demo shortcuts:** The sign-in page has one-tap buttons for each demo account (Rahul, Priya, Suresh, Kamala, Dr. Anjali, Dr. Farah) — all use password `demo1234`.

### Sign out

```
Settings → Account → Sign out
```

Session row deleted from database, cookie cleared.

---

## 2. Onboarding

```
/onboarding (4-step wizard)
```

Shown to any authenticated user who doesn't belong to a family yet.

### Step 1: Create or join

| Path | What happens |
| --- | --- |
| **Create a new family** | Enter family name and city → family row created, user becomes the Admin |
| **Join with an invite code** | Enter the 6-character code → linked to the existing family with the role set by the inviter |

### Step 2: About you

Fill in your own health profile:
- Date of birth, sex, blood group
- Height
- Allergies (name, severity, reaction)
- Conditions (name, since when)
- Emergency contacts (name, relation, phone)

### Step 3: Add members

Add family members who won't sign up themselves (e.g. a child, a parent who doesn't use apps):
- Name, relation, date of birth, sex
- Each creates a `member` row without a linked `user`

### Step 4: Set roles

Assign roles to each member:
- **Admin** — full control
- **Caregiver** — manages assigned people
- **Member** — self only
- **Viewer** — read only

Caregiver step: choose which members this caregiver looks after.

**Complete** → redirect to `/dashboard`.

---

## 3. Family dashboard

```
/dashboard
```

The home screen. What you see depends on your role and scope.

### Sections (top to bottom)

1. **Greeting hero**
   - Personalised greeting ("Good morning, Rahul")
   - Today's date and attention summary ("2 things need your attention today")
   - Quick action buttons: Log a vital, Today's quests
   - Streak flame, quest count, level progress bar

2. **Today's quests**
   - Daily quests: medicines taken, vital recorded, water, walk, fruit & veg, sleep
   - Tap **+** or **−** to log each
   - Finish 3 quests to keep the streak alive
   - Link to full Progress page

3. **Needs attention** (conditional — only if alerts exist)
   - Missed doses, abnormal vitals, refills needed, medicine clashes
   - Each alert shows severity icon + text (never colour alone)
   - Capped at 5, with "view all" link

4. **Family members**
   - Card per visible member: avatar, name, age, blood group, today's dose count, latest reading, alert count
   - Click a card → member profile
   - "Add member" button (hidden for roles without `member.add`)

5. **Today's medicines**
   - Dose list grouped by time (morning / afternoon / night)
   - Tap the circle next to each dose to mark **taken** → pill count decrements
   - Shows member name when viewing multiple people
   - "All done" banner when every dose is ticked

6. **Upcoming appointments**
   - Next 3 weeks, showing doctor name, reason, time, mode (in-person / video), member avatar
   - "Book a doctor" if none scheduled

7. **Quick actions** (4-tile grid)
   - Check symptoms → `/triage`
   - Emergency card → `/emergency`
   - Scan prescription → `/records/scan`
   - Book a doctor → `/appointments/book`

---

## 4. Member profiles

```
/members/[id]
```

One page per family member, with **tabs**:

| Tab | Content |
| --- | --- |
| **Overview** | Bio (age, sex, blood group, height), allergies, conditions, emergency contacts, doctor notes |
| **Vitals** | Charts per vital kind (BP, sugar, weight, pulse, SpO₂, temperature) with normal-range green bands, table view toggle, add vital button |
| **Medicines** | Active medications, 14-day adherence grid (taken/missed/skipped per day), refill countdown, interaction warnings |
| **Records** | Timeline of uploaded documents for this person, upload button |
| **Appointments** | Past and upcoming for this member |

### Editing a profile

Tap **Edit** on the overview tab to update:
- Allergies (add/remove/edit severity)
- Conditions (add/remove)
- Emergency contacts
- Blood group, height, notes

> `RoleGate` hides or disables the edit button with a tooltip explaining why if the user's role doesn't allow `member.edit`.

---

## 5. Medicines

```
/medications
```

### Viewing

- **Member filter** at the top: "All" or filter by one person
- **Today's doses** card with taken/total count and a "read aloud" button
- **Refills due** card: medicines running low, with days-left estimate
- **Clashes in current medicines**: auto-detected drug interactions per person
- **All medicines** grid: each card shows name, generic, strength, schedule times, refill status, prescribed by
- **Check before you buy**: enter a new medicine name and select a person → see if it clashes with their current medicines + cheaper generic alternatives

### Adding a medicine

```
/medications/new (or /medications/new?member=[id])
```

1. Select the **member** this medicine is for
2. Fill in: name, generic name, strength, form (tablet/capsule/syrup/etc.), instructions
3. **Schedule**: pick time slots (morning 8:00, afternoon 14:00, night 21:00, or custom times)
4. Start date, optional end date
5. Pills remaining (for refill tracking), refill alert threshold
6. Prescribed by (doctor name)
7. Submit → medicine row created, doses appear in today's list

### Editing / stopping / deleting

Click a medication card → edit form or stop/delete actions. Stopping sets `active: false`; the medicine stays in history but drops off the daily list.

---

## 6. Dose logging

Doses can be logged from multiple places:

| Location | How |
| --- | --- |
| **Dashboard** → Today's medicines | Tap the circle next to a dose → toggles taken/not taken |
| **Medications** page | Same dose list with member labels |
| **Member profile** → Medicines tab | Person-specific dose list |

### What happens on tap

1. Server Action `logDose()` is called
2. Permission check: `requireCan(ctx, "doses.log", memberId)`
3. Dose log row inserted (or updated if already logged)
4. `pills_left` on the medication decrements by 1
5. Page revalidates → UI updates
6. If this was the last dose of the day → quest "medicines" is complete

### Missed doses

If a scheduled dose time passes without a log, the cron job (every 15 minutes):
1. Detects the missing log
2. Creates a notification (in-app + email to the member and their caregivers)
3. Alert appears on the dashboard "Needs attention" section

---

## 7. Drug interactions and generics

### Automatic clash detection

Every time the medications page loads, `checkInteractions()` runs against all active medicines for each person. It detects:

- **Drug-drug interactions** (e.g. Warfarin + Aspirin) with severity and advice
- **Duplicate prescriptions** (same generic from different brands)

Results appear in the "Clashes in current medicines" card with a warning icon.

### "Check before you buy"

```
/medications → Check before you buy
```

1. Select a **person** from the dropdown
2. Type the **medicine name** you're about to buy
3. See:
   - Clashes with their current medicines
   - Cheaper generic alternatives (if available)
   - Interaction severity and what to tell the doctor

---

## 8. Prescription scanner

```
/records/scan
```

1. Take a **photo** of a prescription (or upload one)
2. Photo is sent to Gemini Vision API
3. AI extracts: medicine names, doses, frequencies, duration
4. Results validated with zod
5. Review the extracted medicines
6. **Add selected** → medicines created automatically with correct schedules

> **Without Gemini API key:** Shows a clearly labelled sample result so the feature is still demonstrable.

---

## 9. Vitals

### Logging a vital

Multiple entry points:
- Dashboard greeting → "Log a vital" button → opens `VitalDialog`
- Member profile → Vitals tab → "Add reading" button
- Progress page → from the care plan

1. Select **member** and **vital type** (BP, sugar, weight, pulse, SpO₂, temperature)
2. Enter the reading:
   - **BP**: systolic + diastolic
   - **Sugar**: value + context (fasting / after meal / random)
   - **Weight**: value in kg
   - **Others**: single value
3. Optional note
4. Submit → vital row created, charts update

### Viewing trends

**Member profile → Vitals tab:**
- Line chart per vital kind
- Green translucent band showing the normal range
- Table view toggle for accessibility
- Abnormal readings highlighted with a warning icon + text

### Abnormal reading alerts

If a reading falls outside the normal range:
- A notification is created immediately
- It appears in the dashboard alerts
- Caregivers for that person are emailed

---

## 10. Appointments

```
/appointments
```

### Two views

| View | What it shows |
| --- | --- |
| **List** (default) | Upcoming appointments sorted by date, past/cancelled below |
| **Calendar** | Month grid with dots on appointment days; click a day to see that day's appointments |

Toggle between views with the List/Calendar switcher.

### Adding manually

Click **"Add appointment"** → dialog opens:
1. Select member
2. Enter doctor name, specialty, location
3. Pick date and time
4. Choose mode: in-person or video (if video, optionally add a meeting URL)
5. Add reason / notes
6. Submit → appointment created

### Appointment card

Each appointment shows:
- Date tile (highlighted if today)
- Doctor name, specialty, reason
- Mode icon (map pin for in-person, camera for video)
- Member avatar
- Actions: edit, cancel, join video call (if video + URL)

---

## 11. Doctor booking

```
/appointments/book
```

Browse doctors and book live slots:

1. **Browse doctors**: filterable by specialty, city, language, teleconsult
2. **Select a doctor** → see their profile: clinic, fee, rating, experience, available slots
3. **Pick a slot**: generated from the doctor's weekly hours minus existing bookings
4. **Choose mode**: in-person or video
5. Select which **family member** this appointment is for
6. Add a reason
7. **Confirm booking** → appointment created, member automatically shared with the doctor until 7 days after the visit

---

## 12. Health records

```
/records
```

### Upload

Click **"Upload record"** → dialog:
1. **Drag and drop** a file (or click to browse)
2. Preview shown for images and PDFs
3. Select member, record type (lab report / prescription / scan / discharge / vaccination / other)
4. Add title, date, provider, notes
5. Submit:
   - File type validated by magic bytes
   - File encrypted with AES-256-GCM (`lib/crypto.ts`)
   - Stored as `bytea` in the `records` table
   - Size capped at 4 MB (Vercel limit)

### Timeline

Records displayed in a **timeline** sorted by date:
- Grouped by month
- Each card shows: type icon, title, member avatar, date, provider
- Click to download (decrypted on the fly, only if your role allows `records.view`)

### Filter

Filter by member, record type, or date range.

---

## 13. Emergency card

```
/emergency/[member-id]
```

A high-contrast, designed-for-3-second-readability card:

### Content (top to bottom)

1. **Name and age** (huge text)
2. **Blood group** (prominent)
3. **Allergies** (each with severity icon)
4. **Conditions**
5. **Current medicines** (name, strength, schedule)
6. **Emergency contacts** (name, relation, phone — clickable to call)
7. **Emergency number: 112**

### Actions

| Action | What it does |
| --- | --- |
| **Print** | Browser print dialog, optimised layout |
| **Share** | Creates a time-limited share link (1 hour / 24 hours / 7 days) |
| **QR code** | Generates a QR code linking to the public share URL |
| **Read aloud** | Reads the card contents using the browser's speech synthesis |

### Public share view

```
/share/[token]
```

- No login required
- Token-validated: checks expiry, revocation
- View count incremented
- Shows the emergency card or a summary depending on the share scope

---

## 14. Symptom check (triage)

```
/triage
```

### Flow

1. **Select member** from dropdown
2. **Describe symptoms** — type or speak:
   - Text input field
   - Voice button: records speech in any of 10 Indian languages, transcribes to text
3. **Submit** → two-stage triage:

   **Stage 1 — Deterministic safety rules:**
   - Pattern matching against red-flag combinations
   - Chest pain + sweating → **Emergency** (call 112)
   - Stroke signs (FAST) → **Emergency**
   - SpO₂ < 92% → **Emergency**
   - Self-harm ideation → **Crisis** (shows Tele-MANAS 14416)

   **Stage 2 — AI phrasing (if Gemini key set):**
   - AI can only raise the severity level, never lower it
   - Anything resembling a diagnosis is dropped
   - Output validated with zod

4. **Result displayed:**
   - Triage level badge: Emergency (red) / See doctor today / Book a doctor / Home care (green)
   - Red flags listed
   - Advice (never a diagnosis, never a medicine name)
   - "Not a diagnosis. Consult a doctor." disclaimer

5. **History** shown below: recent checks with level, symptoms snippet, and source (rules / rules+AI)

### Without AI

Falls back to safety rules only. The badge says "Safety rules first (AI off)".

---

## 15. Progress and rewards

```
/progress
```

### Gamification dashboard

The progress page is personal — filter by member at the top.

**Summary section:**
- Member avatar, streak flame + count, best streak, weekly XP
- 7-day week strip (brand fill for streak days, dashed for rest days)
- Level progress bar (Seed → Sprout → Sapling → Bloom → Harvest hero)
- "N more quests today to keep your streak"

**Today's quests:**
- 6 daily goals: medicines, vital reading, water, walk, fruit & veg, sleep
- Tap **+** to increment, **−** to decrement
- Finish any 3 to keep the streak alive
- Grace day button: take a rest day (period, sick, travel, mental health) — protects the streak

**Is it working? (health score chart):**
- Weekly health score: 40% medicines adherence, 35% readings in normal range, 25% habit goals
- Line chart over time with a "Plan started" marker
- Before/after averages if a plan is active
- Improvements shown: score change, BP trend, sugar trend, weight trend

**Personalised plan:**
- Generated from conditions, age, sex, latest readings, PCOS phenotype
- Categories: move, eat, sleep, track, meds, mind
- Start a plan → `care_plans` row created, plan-started line appears on the chart
- Each plan item links to the relevant action (e.g. "Record your BP" → vital dialog)

**Badges:**
- 12 badges unlocked by milestones (7-day streak, 30-day streak, all quests, etc.)
- Locked badges shown greyed with a lock icon
- Badge colour is brand only (violet)

**Family leaderboard:**
- Weekly XP ranking for visible family members
- Shows name, level, streak, weekly XP

**Last 90 days:**
- Habit tally per goal (how many days each goal was met)

---

## 16. PCOS care

```
/pcos
```

A specialised care module for women with PCOS. Only appears for female members or those with a PCOS/PCOD condition.

### Setup flow

```
/pcos → Prescription & quiz tab
```

1. **Doctor's prescription:**
   - Doctor name, diagnosis date
   - Add prescribed medicines (name, dose, frequency)
   - Add supplements
2. **8-question quiz:**
   - Questions about symptoms, cycle patterns, stress, diet
   - Determines PCOS phenotype: insulin-resistant, inflammatory, adrenal stress, or post-pill
3. **Result:** phenotype card with explanation
4. **Save** → `pcos_profiles` row created, daily protocol generated

### Daily tabs

| Tab | Content |
| --- | --- |
| **Today** | Daily protocol checklist (e.g. "Protein within 1 hour of waking", "10-minute walk after lunch") tailored to phenotype. Tick items off → XP earned. 7-day adherence chart. Prescription summary. Grace day button. |
| **Cycle** | Period log: start date, end date, flow level. No predictions, no "late" alarms — just your own rhythm. Cycle stats: average length, range, current day. Cycle length chart over time. Pattern flags (e.g. "Cycles shorter than 21 days — discuss with your doctor"). |
| **Symptoms** | Tap symptoms (acne, bloating, fatigue, mood, hair, cravings, cramps, headache, sleep) to set severity: mild, moderate, strong. 4-week heatmap (darker squares = stronger symptoms). Helps identify patterns to share with the doctor. |
| **Food** | Meal logger: select meal type + food items. Gentle feedback on pairing carbs with protein/fibre. Today and yesterday's log. |

### Support

Every PCOS page shows:
- Support helplines: iCall, Vandrevala Foundation, emergency 108
- "Not a diagnosis. Discuss changes with your doctor."

---

## 17. Family settings

```
/settings
```

Six tabs, accessible based on role:

### Members tab

- List of all family members with role badges, relation, age
- Edit a member's role, relation, assigned caregivers (admin only)
- Remove a member (admin only)

### Invites tab

- Create invite: select a role, optionally link to an existing profile (e.g. "send this invite to Papa so he can log in as his member profile")
- Copy invite code or send via email/WhatsApp
- Active invites list with status, expiry
- Revoke an invite

### Roles & permissions tab

- Matrix grid: roles (columns) × actions (rows)
- Toggle individual permissions on/off
- Locked cells: admin row can't be changed, `family.manage` can't be given to non-admins, viewer write actions can't be enabled
- Shows the effective permission after overrides

### Doctors tab

- Connected doctors: doctor name, specialty, shared member, access reason, expiry
- Connect a new doctor: enter their 6-character connect code → choose member to share, duration (1–12 months), consent
- Revoke a doctor's access instantly

### Sharing & privacy tab

- **Share links**: active/expired/revoked, with scope, member, views, last viewed, URL
- Create new share link: scope (emergency / summary / records), member, duration
- Revoke a link
- **How your data is protected**: consent, encryption, time-limited sharing, least access, audit log
- **Activity log**: chronological list of all role, record, sharing and permission changes

### Account tab

- Change password
- Email preferences: toggle reminders on/off, toggle daily digest
- Mail transport status indicator
- Run reminder check now (admin only — triggers the cron job manually)
- Data export: download all family data as JSON (admin only)

---

## 18. Notifications

### In-app notifications

- **Bell icon** in the navigation header
- Shows unread count badge
- Click to see the notification list:
  - Missed doses ("Suresh missed Glycomet at 08:00")
  - Abnormal vitals ("Suresh's BP is 155/98 — higher than usual")
  - Refill warnings ("Aarav's cetirizine: 5 pills left")
  - Interaction warnings
  - Appointment reminders ("Dr. Deshpande tomorrow at 10:00")
  - Doctor notes ("Dr. Anjali left a note about Suresh")
- Click a notification → navigates to the relevant page
- Mark as read on click

### Email notifications

Sent via nodemailer based on user preferences:

| Email | When | Who receives |
| --- | --- | --- |
| Dose-time reminder | At each scheduled dose time | The member |
| Missed dose alert | 30 min after a missed dose | The member + their caregivers |
| Abnormal vital | On log | The member + admin |
| Refill warning | When pills drop below threshold | The member + admin |
| Appointment reminder | Day before | The member |
| Daily digest | 7:00 AM IST | Each person (respecting their scope) |
| Doctor note | When a doctor adds a note | The member + admin |

### Dedupe

Every notification has a `dedupe_key`. Running the cron job more frequently is safe — duplicate notifications are never created.

---

## 19. Doctor portal

```
/doctor
```

A separate UI for doctor accounts. Reached by signing in with a doctor account.

### Doctor home

- Greeting with today's date and appointment count
- **Connect code** displayed prominently with a copy button
- **Appointments** for the next 2 weeks: patient name, age, reason, mode, time
  - "Open chart" button → patient detail page
  - "Join" button for video consults
- Link to "All patients"

### Patient list

```
/doctor/patients
```

- All patients shared with this doctor (via connect code or booking)
- Each card: name, age, family, access reason (connected / booking), expiry

### Patient detail

```
/doctor/patients/[member-id]
```

- **Medicines**: current list with clashes highlighted
- **Vitals**: recent readings with trend indicators
- **Records**: shared health records
- **Notes**: doctor's own notes for this patient
  - Add note: summary, advice, follow-up date
  - Note emailed to the family

### Access control

- Access is time-limited (`doctor_access.expiresAt`)
- Booking auto-creates access until 7 days after the visit
- Connect code creates access for 1–12 months (chosen by the family)
- Families can revoke at any time from Settings → Doctors
- Expired access → patient disappears from the doctor's portal

---

## 20. Sharing with a doctor

### Via connect code

```
Settings → Doctors tab → Connect a doctor
```

1. Enter the doctor's **6-character connect code** (e.g. "ANJ7DQ")
2. Doctor found → shows their name, specialty, clinic
3. Select which **member** to share
4. Choose **duration** (1 month / 3 months / 6 months / 12 months)
5. **Consent checkbox**: "I agree to share [member]'s health information with Dr. [name] until [date]"
6. Submit → `doctor_access` row created
7. Doctor now sees this patient in their portal

### Via booking

When a family books an appointment with a doctor:
1. The member is automatically shared with the doctor
2. Access lasts until **7 days after the appointment**
3. No separate consent step (booking implies consent)

### Revoking access

```
Settings → Doctors tab → click "Remove" next to a connection
```

1. Confirmation dialog: "Remove Dr. [name]'s access to [member]?"
2. Submit → `doctor_access.revokedAt` set
3. Doctor immediately loses access

---

## 21. Share links

### Creating

```
Settings → Sharing & privacy → Create a share link
```

or from the emergency card:

1. Select **member**
2. Choose **scope**: emergency card / health summary / full records
3. Choose **duration**: 1 hour / 24 hours / 7 days / 30 days
4. Optional **label** (e.g. "For Dr. Khan")
5. Submit → token generated, link created

### The public page

```
/share/[token]
```

- No login required
- Shows the shared content based on scope
- View count tracked
- Revocation and expiry checked on every view

### Managing

From Settings → Sharing & privacy:
- See all links: active, expired, revoked
- View count and last viewed timestamp
- **Revoke** → link becomes instantly invalid

---

## 22. View-as mode (admin)

Admins can preview the app as another role:

```
Dashboard → role badge dropdown → "View as Caregiver / Member / Viewer"
```

### What happens

1. `VIEW_AS_COOKIE` set in the browser
2. On every request, the server reads this cookie
3. If the user is an admin, it applies the selected role to the entire `AccessContext`
4. The admin sees exactly what that role sees:
   - Pages filtered to the role's scope
   - Buttons hidden/disabled per that role's permissions
   - RoleGate tooltips explain why things are locked
5. A banner at the top says "Viewing as [role] — Exit"
6. Click "Exit" → cookie cleared, back to admin view

> This is **not a UI-only trick**. The server enforces the selected role. Data queries, visible members, and permission checks all use the downgraded role.

---

## 23. Voice and language

### Voice input

Available on the **symptom check** page and anywhere a `SpeakButton` appears:

1. Tap the **microphone button**
2. Speak in any of **10 Indian languages**: Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, or English
3. Speech is transcribed to text via the Web Speech API
4. Text appears in the input field for review/editing

### Read aloud

Available on:
- **Emergency card** → reads all card content
- **Medicines page** → reads today's pending doses
- **Medication cards** → reads name, strength, instructions

Uses the browser's speech synthesis API. Works offline once the page is loaded.

---

## Workflow map

A visual map of how the major flows connect:

```
                                ┌──────────────┐
                                │   Landing    │
                                │    page      │
                                └──────┬───────┘
                                       │
                        ┌──────────────┼──────────────┐
                        ▼              ▼              ▼
                 ┌────────────┐ ┌────────────┐ ┌────────────┐
                 │  Sign in   │ │  Sign up   │ │  Sign up   │
                 │            │ │  (family)  │ │  (doctor)  │
                 └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
                       │              │              │
                       │              ▼              ▼
                       │       ┌────────────┐ ┌────────────┐
                       │       │ Onboarding │ │  Doctor    │
                       │       │  wizard    │ │  portal    │
                       │       └─────┬──────┘ └────────────┘
                       │             │
                       ▼             ▼
                 ┌─────────────────────────────────────────┐
                 │            Family Dashboard             │
                 │                                         │
                 │  Greeting · Quests · Alerts · Members   │
                 │  Doses · Appointments · Quick actions    │
                 └───────────────┬─────────────────────────┘
                                 │
          ┌──────────┬───────────┼───────────┬──────────┐
          ▼          ▼           ▼           ▼          ▼
   ┌────────────┐ ┌──────┐ ┌──────────┐ ┌──────┐ ┌──────────┐
   │  Members   │ │ Meds │ │  Appts   │ │ Recs │ │ Settings │
   │  /[id]     │ │      │ │          │ │      │ │          │
   │            │ │      │ │          │ │      │ │          │
   │ Overview   │ │Today │ │ List     │ │Upload│ │ Members  │
   │ Vitals     │ │Refill│ │ Calendar │ │Scan  │ │ Invites  │
   │ Medicines  │ │Clash │ │ Book     │ │Time- │ │ Roles    │
   │ Records    │ │Check │ │          │ │line  │ │ Doctors  │
   │ Appts      │ │      │ │          │ │      │ │ Privacy  │
   └────────────┘ └──────┘ └──────────┘ └──────┘ │ Account  │
                                                  └──────────┘
          ┌──────────┬───────────┬───────────┐
          ▼          ▼           ▼           ▼
   ┌────────────┐ ┌──────────┐ ┌──────┐ ┌──────────┐
   │ Emergency  │ │ Symptom  │ │PCOS  │ │ Progress │
   │   card     │ │  check   │ │ care │ │ & rewards│
   │            │ │          │ │      │ │          │
   │ Print      │ │ Voice    │ │Today │ │ Streak   │
   │ Share/QR   │ │ Rules+AI │ │Cycle │ │ Quests   │
   │ Read aloud │ │ History  │ │Sympt │ │ Score    │
   │            │ │          │ │Food  │ │ Plan     │
   │            │ │          │ │Setup │ │ Badges   │
   │            │ │          │ │      │ │ Board    │
   └────────────┘ └──────────┘ └──────┘ └──────────┘
```

---

## Role-scoped visibility summary

What each role sees across the app:

| Page | Admin | Caregiver | Member | Viewer |
| --- | --- | --- | --- | --- |
| Dashboard members | All | Assigned + self | Self only | All (read-only) |
| Dose logging | ✅ All | ✅ Assigned | ✅ Own | ❌ |
| Add medicine | ✅ | ✅ Assigned | ✅ Own | ❌ |
| Log vital | ✅ | ✅ Assigned | ✅ Own | ❌ |
| Book appointment | ✅ | ✅ Assigned | ✅ Own | ❌ |
| Upload record | ✅ | ✅ Assigned | ✅ Own | ❌ |
| View records | ✅ | ✅ Assigned | ✅ Own | ✅ |
| Emergency card | ✅ | ✅ Assigned | ✅ Own | ✅ |
| Symptom check | ✅ | ✅ Assigned | ✅ Own | ❌ |
| Share links | ✅ | ❌ | ✅ Own | ❌ |
| Family settings | ✅ | ❌ | ❌ | ❌ |
| View-as mode | ✅ | ❌ | ❌ | ❌ |

> Every cell in this table is enforced **on the server** by `requireCan()`. The UI hides/disables controls as a convenience, but the server is the authority.
