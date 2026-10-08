# Project Pulse — MVP Build Plan

Oct 8, 2026 · @Soumya

## The product in one page

Pulse is a Hindi-first web app where a Type 2 diabetes patient and their family log three things a day, see what actually moves the patient's sugar, and hand the doctor a 90-day picture in one link.

**Beachhead (assumed: change it if your team picks differently).** Ramesh-type patients: Type 2 diabetes, aged 50 to 65, in Kanpur, on a budget Android phone, with a child in another city who manages their medicines. He fits the family-roles requirement best, diabetes has a hard biomarker (fasting sugar, HbA1c) for clinical proof, and the case says about 65% of patients have family involved in daily decisions. A light weekly mood check covers the mind side, since about 1 in 4 chronic patients show signs of depression or anxiety.

**The one end-to-end journey the prototype must run:**

1. Rahul (son, Pune) signs up, creates a profile for Papa, adds 3 medicines and invites Papa and Maa with a code.
2. Ramesh joins, picks Hindi, and logs his day in under 10 taps: sugar reading, medicines taken, meal chips, walked or not.
3. He enters a reading of 320. Both he and Rahul get an alert with clear next steps.
4. After two weeks of logs, an insight card appears: his sugar is higher after rice dinners than roti dinners.
5. A weekly two-question energy check stays private to Ramesh. A low score opens a help screen, not a family alert.
6. Before the clinic visit, Rahul creates a doctor link. The doctor reads a one-page 90-day summary in 30 seconds.

**What we deliberately do not build (and why):**

- No AI chatbot giving health advice. Software cannot diagnose or prescribe, and patients already distrust advice.
- No calorie counting or food photo recognition. Patients quit logging because it felt like homework, so meals are one-tap chips.
- No native app or wearables. A PWA installs from a link on any budget Android phone; no hardware means no new device risk.
- No doctor accounts. Doctors have no time to sign up, so they get a read-only, expiring link.
- Push reminders and video calls come last, as stretch phases. The journey works without them.

## Stack and how to prompt each phase

Every phase prompt = the context block below + the Data model and Roles sections + that one phase. Ask the model for that phase's files only, run its "Done when" checks, then commit before the next phase.

```markdown
PROJECT: Pulse, a chronic care web app for Type 2 diabetes patients in India and their family. Hindi-first, mobile-first PWA for budget Android phones.

STACK: Next.js (App Router, TypeScript), Tailwind + shadcn/ui, PostgreSQL, Drizzle ORM + drizzle-kit migrations, postgres.js driver, simple email + password login with bcryptjs, a sessions table and an httpOnly cookie (no auth library), zod, shadcn charts (Recharts).

RULES:
- Server Components for reads, Server Actions for writes. No separate REST API unless the phase says so.
- Every page or action that touches patient data first calls requirePermission(patientId, permission) from lib/permissions.ts.
- Validate every input with zod schemas in lib/validators.ts.
- Design for 360px wide screens. Tap targets at least 44px. Logging anything takes 3 taps or fewer.
- All UI text goes through t('key') from lib/i18n.ts (en.json + hi.json).
- Never generate medical advice. Health messages come only from constants in lib/safety.ts.
- Pure logic (permissions, safety rules, insights) lives in lib/ as pure functions with unit tests (vitest).
- Only build what this phase asks. Do not change files from earlier phases unless told.
```

**Folder layout:**

```
app/auth                           Sign in + Create account tabs
app/(app)/home                     patient switcher + today
app/(app)/p/[patientId]/log        sugar, meals, walk, sleep
app/(app)/p/[patientId]/meds
app/(app)/p/[patientId]/family     members, roles, invites
app/(app)/p/[patientId]/insights
app/(app)/p/[patientId]/alerts
app/join/[code]                    accept an invite
app/share/[token]                  doctor summary, no login
signaling/server.ts                WebSocket signaling, deployed alone on Render
db/schema.ts  db/index.ts  db/seed.ts
lib/auth.ts  lib/permissions.ts  lib/safety.ts  lib/insights.ts  lib/foods.ts  lib/i18n.ts  lib/validators.ts
```

**Team habits that protect your score:** commit at the end of every phase with the message `phase N: <name>`, so the checkpoint reviewers see a from-scratch history after T+0. Give each phase one owner who can explain its code when an evaluator asks.

## Data model

Thirteen app tables plus two for login: users (name, email unique and lowercase, passwordHash) and sessions (id = random token, userId, expiresAt). Every table has `id uuid` primary key and `createdAt`; every health table has `patientId` and `loggedBy` (user id) so the app can show "Rahul logged this for Papa".

**Enums:** `role` = owner, caregiver, family · `scope` = vitals, meds, meals, mood · `glucose_context` = fasting, after\_meal, random · `meal_slot` = breakfast, lunch, dinner, snack · `alert_severity` = warning, urgent.

| Table | Key columns | Notes |
| --- | --- | --- |
| patients | name, birthYear, city, condition, glucoseLow (default 70), glucoseHigh (default 300), createdBy | One row per person being cared for |
| memberships | patientId, userId, role, scopes (text\[\]) | Unique on patientId + userId. The heart of RBAC |
| invites | patientId, code (6 chars), role, scopes, expiresAt, usedAt, createdBy | Code expires in 48 hours, single use |
| medications | name, dose, times (text\[\] like 08:00), active | Set up by the caregiver |
| med\_logs | medicationId, date, slot, takenAt, loggedBy | Unique on medicationId + date + slot. A missed dose = a scheduled slot with no row |
| glucose\_readings | mgdl (int), context, measuredAt, note | Manual entry from any glucometer |
| meals | slot, items (text\[\] of food keys), eatenAt | Food keys come from lib/foods.ts |
| daily\_checkins | date, walked (bool), sleep (1 to 3) | Unique on patientId + date |
| mood\_checks | q1, q2 (0 to 3), score, selfHarmFlag (bool, nullable), checkedAt | Written by the owner only |
| lab\_results | kind (hba1c), value (numeric), takenOn | Feeds the North Star metric |
| alerts | kind, severity, sourceId, ackBy, ackAt | Created by safety rules |
| share\_links | token (32 random chars), expiresAt, includeMood (bool), revokedAt, createdBy | Doctor view, no login |
| audit\_log | actorUserId, patientId, action, detail (jsonb) | Member changes, share links, data deletion |

**lib/foods.ts** is a constant list, not a table: each food has a key, an English and Hindi label, and a carb tag (high, medium, low). Start with 12 everyday items: roti, rice, paratha, dal, sabzi, poha, curd, egg or meat, fruit, sweets, chai with sugar, fried snack.

## Family roles and permissions

Access = role + scopes. The role says what a member can do; the scopes (vitals, meds, meals, mood) say which data they can see. The patient decides both for everyone, and mood is off for every member until the patient turns it on.

| Action | Patient (owner) | Caregiver (e.g. son) | Family (e.g. wife who cooks) |
| --- | --- | --- | --- |
| See today's summary | Yes | Yes | Yes |
| See sugar readings and trends | Yes | If vitals shared | If vitals shared |
| Log sugar reading | Yes | Yes | No |
| Add or edit medicines | Yes | Yes | No |
| Mark a dose as taken | Yes | Yes | Yes |
| Log meals | Yes | Yes | Yes |
| See or answer the mood check | Yes | See only if mood shared | No |
| See insights | Yes | If vitals and meals shared | No |
| Receive sugar alerts | Yes | Yes | If vitals shared |
| Invite, remove, change roles | Yes | Only until the patient joins | No |
| Create a doctor link | Yes | Yes | No |
| Delete all patient data | Yes | No | No |

**How it is enforced (lib/permissions.ts):**

1. `ROLE_PERMISSIONS`: a constant map from role to its list of permissions, copied from the table above.
2. `PERMISSION_SCOPE`: a map from permission to the scope it needs (for example `view_vitals` needs `vitals`).
3. `can(membership, permission, ctx)`: a pure function, no database. `ctx.patientHasOwner` handles the caregiver set-up case. Unit-test every cell of the table.
4. `requirePermission(patientId, permission)`: reads the session, loads the membership, calls `can()`, throws a 403 error if false. Called at the top of every page and Server Action under `/p/[patientId]`.
5. UI hides what a role cannot do, but the server check is the real gate.

**Edge rules:** whoever creates a profile for someone else becomes caregiver; the patient joins later as owner through an invite. Removing a member or turning off a scope takes effect on their next request. Every member change is written to audit\_log.

## Safety net rules

Safety rules are fixed code in lib/safety.ts, written and reviewed by the team, never generated by an LLM at runtime. The app tells people when to reach a human; it never tells them what dose to take.

| Trigger | Severity | Who is told | What the app shows |
| --- | --- | --- | --- |
| Sugar below 54 mg/dL | Urgent | Patient + caregivers | "Very low sugar. Follow your doctor's low-sugar plan now. If confused or fainting, call 108." Buttons: Call 108, Call Rahul |
| Sugar 54 to below glucoseLow (70) | Warning | Patient + caregivers | "Low sugar. Follow your doctor's low-sugar plan and check again soon." |
| Sugar at or above glucoseHigh (300) | Warning | Patient + caregivers | "High reading. Contact your doctor today." |
| Sugar 400 or above | Urgent | Patient + caregivers | "Very high reading. Call your doctor now. If vomiting, breathless or drowsy, call 108." |
| 3 or more missed doses in 2 days | Warning | Caregivers only | "Papa missed 3 doses since yesterday." Button: Call Papa |
| No logs for 3 days | Nudge | Caregivers only | "No updates from Papa in 3 days. Check in?" |
| Weekly check score 3 or more | Private | Patient only | Kind message + Tele-MANAS helpline 14416 + "Add this to my doctor link?" |
| Follow-up question answered yes | Crisis | Patient only, unless they tap to share | Full-screen help: Call Tele-MANAS 14416, Call 112, Call a family member. "Can we tell Rahul you need support?" |

**The weekly check** uses the two PHQ-2 questions (loss of interest, feeling low; each 0 to 3), shown as "How has your energy been?" to avoid stigma. A score of 3 or more adds one follow-up question about thoughts of self-harm. It screens; it never diagnoses.

**The trade-off to defend:** auto-alerting family in a crisis would be safer in the moment, but patients who fear being found out stop answering honestly. So the app makes help one tap away and asks before telling anyone. A "Need help now" item sits in the menu on every screen.

glucoseLow and glucoseHigh are per-patient fields a caregiver can change on the doctor's instruction; the urgent limits (54 and 400) are fixed. Tele-MANAS is the government's free 24/7 mental health line, reachable on 14416 or 1-800-891-4416 ([source](https://en.vikaspedia.in/viewcontent/health/mental-health/tele-manas)).

## 24-hour roadmap

&#91;embedded content: 24-hour roadmap · 12 phases, 3 checkpoints\]

Each checkpoint is a working demo, not a slide: roles by T+6, the alert loop by T+12, the full Hindi journey by T+18.

## Phases 0 to 3: foundation and family roles (T+0 to T+6)

By checkpoint 1, a judge can sign up, create a profile for Papa, invite family, and see roles block what they should.

### Phase 0: Project setup (about 45 min)

- Create the Next.js app (TypeScript, Tailwind, App Router). Run shadcn init and add: button, card, input, label, form, select, dialog, sheet, tabs, badge, toggle-group, checkbox, switch, avatar, dropdown-menu, sonner, chart.
- Postgres on Neon free tier (or Docker locally). Install drizzle-orm, drizzle-kit, postgres. Add db/index.ts, drizzle.config.ts and scripts `db:generate`, `db:migrate`, `db:studio`.
- Mobile shell: header with patient name, bottom nav (Home, Log, Meds, Family), empty placeholder pages.
- Add lib/i18n.ts with `t(key)`, en.json and hi.json, and a language switch saved in a cookie.

**Done when:** the shell renders cleanly at 360px, `db:migrate` runs, the language switch flips the nav labels, and the first commit is pushed.

### Phase 1: Login (about 45 min)

- Add the users and sessions tables to db/schema.ts and migrate. Install bcryptjs.
- lib/auth.ts with five small functions:
  - `hashPassword` / `verifyPassword` using bcryptjs (10 rounds).
  - `createSession(userId)`: random 32-byte hex token as the session id, 30-day expiry, sets an httpOnly, sameSite lax, secure-in-production cookie named `pulse_session`.
  - `getCurrentUser()`: reads the cookie, loads session + user, returns null if missing or expired.
  - `requireUser()`: calls getCurrentUser and redirects to /auth if null.
  - `signOut()`: deletes the session row and the cookie.
- /auth page with shadcn Tabs: **Sign in** (email, password) and **Create account** (name, email, password of 8+ characters). No OTP, no email verification. A successful sign-up logs the user straight in.
- Server Actions validated with zod; emails lowercased; one generic error "Email or password is incorrect"; a taken email shows "An account with this email already exists".
- app/(app)/layout.tsx calls requireUser(), so every app page is protected without middleware. Sign-out sits in the header menu.
- Cookies can only be set inside Server Actions or Route Handlers, not Server Components (use `await cookies()` from next/headers).
- Deliberately skipped: OTP, email verification, password reset, social login.

**Done when:** creating an account lands you on /home; sign out then sign in works; a wrong password shows the generic error; a logged-out visit to /home redirects to /auth; the users table holds a bcrypt hash, never the plain password.

### Phase 2: App schema and seed (about 45 min)

- Write every table from the Data model section in db/schema.ts, plus lib/foods.ts.
- db/seed.ts: 3 users (Ramesh, Rahul, and Maa as family; password demo1234, hashed with the same helper as sign-up), 1 patient, memberships with different roles, 3 medicines, 7 days of readings, meals and med logs.

**Done when:** migrations run on a fresh database, `db:seed` fills it, and Drizzle Studio shows the rows.

### Phase 3: Profiles, invites and RBAC (about 1.5 hours)

- lib/permissions.ts exactly as the Roles section describes, with vitest tests for every cell of the permissions table.
- Home: list of patients I belong to, plus "Create a profile" with a "This is for me / for a family member" choice.
- Family page: members with role badges; owner sees scope switches per member, a role select and a Remove button.
- Invite: pick role + scopes, get a 6-character code and a WhatsApp share link (`https://wa.me/?text=...`). /join/\[code\] accepts it after login.
- Write to audit\_log on invite, join, role change, scope change and removal.

**Done when:** all permission tests pass; a family member gets 403 when posting to the medicine form directly; the caregiver cannot see mood until the patient turns that scope on; a removed member loses access on the next page load.

**Checkpoint 1 (T+6):** demo sign-up, create Papa's profile, invite, and show a blocked action.

## Phases 4 to 6: daily loop and safety (T+6 to T+12)

By checkpoint 2, Ramesh can log a full day in under 10 taps, and a dangerous reading reaches both him and Rahul.

### Phase 4: Daily log (about 1.5 hours)

- /p/\[id\]/log with three cards on one screen:
  - Sugar: large number input, toggle for fasting / after meal / random, Save.
  - Meal: slot toggle (auto-picked from time of day) + food chips from lib/foods.ts, multi-select, one Save.
  - Day: "Walked today?" yes/no and sleep as 3 faces (bad, okay, good).
- Home shows today's timeline with who logged each item ("Rahul logged for Papa, 8:10 am").
- Each card only renders if the member's role allows it (family sees meals, not sugar).

**Done when:** a full day (1 reading, 3 meals, walk, sleep) takes under 10 taps; a family member sees the meal card but no sugar card and gets 403 if they post a reading directly.

### Phase 5: Medicines (about 1 hour)

- Caregiver adds medicines: name, dose, times as chips (8 am, 2 pm, 8 pm, or custom).
- Home shows "Due now" cards with a big Taken button that writes med\_logs.
- Meds page: a 7-day grid per medicine (taken, missed, upcoming) and this week's adherence percent.

**Done when:** tapping Taken updates the grid and the percent; family can tick Taken but sees no edit controls; a dose not ticked by end of its day shows as missed.

### Phase 6: Safety net (about 1 hour)

- lib/safety.ts: pure `evaluateGlucose(mgdl, patient)` returning null or `{kind, severity}`, using the thresholds in the Safety section, plus unit tests.
- The log-sugar action calls it, writes an alert row, and opens a full-screen alert for the person logging (Call 108 and Call caregiver buttons use `tel:` links).
- Alerts page and a bell with unread count for caregivers, refreshed on page load and every 30 seconds. No websockets.
- Missed-dose and no-logs rules computed when home loads.
- Weekly check: a Monday prompt for the owner only, the follow-up question, the crisis screen, and the "Need help now" menu item.

**Done when:** entering 45 shows the urgent screen; Rahul's bell shows it on his next refresh; Maa does not see it unless she has the vitals scope; Rahul cannot see the weekly check score until Ramesh shares mood.

**Checkpoint 2 (T+12):** demo the logging loop, a high reading, and Rahul's alert on a second phone.

## Phases 7 to 9: insight, doctor and demo-ready (T+12 to T+18)

By checkpoint 3, the full journey runs in Hindi on a phone, and the doctor link shows 90 days on one page.

### Phase 7: Insights (about 1.5 hours)

lib/insights.ts holds pure functions over the last 30 days, each returning null when data is thin. No AI: plain averages the team can explain.

- **Meal effect:** pair each after-meal reading with the latest meal in the 3 hours before it. Compare meals with a high-carb item against those without. Show a card if each group has 3 or more readings and the gap is 20 mg/dL or more: "After dinners with rice, your sugar averaged 212. With roti, 168."
- **Walk effect:** next-morning fasting reading on days walked vs days not walked.
- **Medicine effect:** fasting average in weeks with 80% or more adherence vs weeks below.
- **Trend:** this week's fasting average vs last week's.
- Insights page: a 30-day fasting line chart with a shaded target band (from patient thresholds), then the cards. Wording says "seems to" and ends with "Talk to your doctor before changing medicines."

**Done when:** unit tests cover each function; the seed data produces at least 2 cards; a new patient sees "Log 3 more after-dinner readings to see what affects your sugar" instead of an empty page.

### Phase 8: Doctor summary link (about 1.5 hours)

- HbA1c entry form writing lab\_results.
- "Create doctor link": expires in 7 days, revocable, with an "Include weekly check result" checkbox (off by default).
- /share/\[token\], no login: patient header, 90-day chart, fasting average, percent of readings in range, adherence percent, HbA1c values, alert count, top 2 insights, weekly check result only if included.
- Print stylesheet so it fits one A4 page. Write to audit\_log when a link is created or revoked.

**Done when:** the link opens logged-out; an expired or revoked link shows "This link is no longer active"; it prints on one page; a doctor can read it in about 30 seconds.

### Phase 9: Hindi, PWA and demo data (about 1 hour)

- Fill hi.json for every string; check no English leaks on the Hindi screens.
- PWA: manifest, icons, theme colour, so it installs to the Android home screen.
- db/demo-seed.ts: 60 days of synthetic data for Ramesh with a clear rice-dinner pattern, a missed-dose streak, one high reading and two HbA1c entries. Label it synthetic everywhere it shows in the demo.
- Delete-my-data button for the owner (removes patient and all rows; logged first to audit\_log).

**Done when:** the whole journey runs in Hindi on a real phone with Chrome DevTools throttled to slow 4G, and the app installs from its link.

**Checkpoint 3 (T+18):** full end-to-end demo. Keep T+18 to T+20 free for the founders' mid-sprint update ("watch this space"), and give T+20 to T+24 to the deck.

## Phases 10 and 11: stretch, hardest last

Start these only after checkpoint 3 passes and the deck is on track; the journey must never depend on them. If time is short, cut Phase 11 first.

### Phase 10: Push reminders (about 2 hours)

- Service worker + Web Push with the `web-push` package and VAPID keys. New table push\_subscriptions (userId, endpoint, keys).
- A route `/api/cron/reminders` run every 15 minutes (Vercel Cron or any scheduler): pushes "Time for Metformin" to the patient at each dose time, and "Papa hasn't taken his 8 am dose" to caregivers 1 hour later.
- Respect roles: family members only get pushes for scopes they hold.

**Done when:** a push arrives on an Android phone with Chrome closed, and tapping it opens the Due now card.

SMS and WhatsApp reminders are roadmap only: Indian SMS needs DLT registration and WhatsApp needs Business API approval, neither doable in 24 hours.

### Phase 11: Family calls with WebRTC (3 hours or more)

Same pattern as your existing SocketProvider and `ws` signaling server, with three fixes a health app needs: only logged-in users can register, only members of the same family can call each other, and every call gets a fresh peer connection.

**Signaling server (signaling/server.ts, its own Render web service):**

- Node + `ws`, port from `PORT`. Same flow as before: register, call, answer, ice\_candidate, plus reject and hangup. Drop the chat-message type; Pulse does not need it.
- Two maps: userId to socket, and activeCalls (userId to the peer's userId). Answer, ice\_candidate and hangup are forwarded only between two users in an active call.
- Tokens are `base64url(JSON payload).signature`, signed with a SIGNALING\_SECRET shared with the Next.js app. Verify with `crypto.createHmac('sha256', secret)` and `timingSafeEqual`, and reject expired ones.
- On socket close: remove the user and send call\_ended to their peer if they were in a call.
- Write it fresh inside the repo after T+0 (about 80 lines). Pointing at the server you deployed before the sprint risks the pre-built-prototype rule in Section 10.

| Message | Sent by | Fields | Server does |
| --- | --- | --- | --- |
| register | Client on connect | token {userId, name, exp} | Verifies token, maps userId to socket, replies registered |
| call | Caller | ticket {from, to, patientId, exp}, offer, video | Checks ticket.from is this socket's user, marks both in a call, sends incoming\_call {fromUserID, fromName, offer, video} to the target, or user\_offline |
| answer | Callee | targetUserID, answer | Sends call\_answered |
| reject | Callee | targetUserID | Clears the call, sends call\_rejected |
| ice\_candidate | Either side | targetUserID, candidate | Sends ice\_candidate with fromUserID = the sender |
| hangup | Either side | targetUserID | Clears the call, sends call\_ended |

**Next.js side:**

- lib/signaling.ts: `signToken(payload)` using the same secret.
- Server Actions: `getSignalingToken()` (logged in, 10-minute expiry); `getCallTicket(patientId, targetUserId)` (requirePermission `start_call`, both users active members of that patient, 60-second expiry); `getIceServers()` (STUN + TURN credentials from env); `logCallStart` / `logCallEnd` writing call\_logs (patientId, callerId, calleeId, startedAt, endedAt).
- Add a `start_call` permission for owner, caregiver and family in lib/permissions.ts.
- components/call/CallProvider.tsx ("use client"), mounted in app/(app)/layout.tsx, same shape as your SocketProvider with these changes:
  - Connect once after login, send a small keepalive every 30 seconds, reconnect with backoff if the socket closes.
  - Create a new RTCPeerConnection per call and close it on hangup, so a second call works without a reload.
  - Keep the ICE candidate queue in a useRef and flush it right after setRemoteDescription.
  - Incoming call = shadcn Dialog with the caller's name and Accept / Decline, not `confirm()`.
  - The call screen overlays the app (Mute, Video off, End); children always stay mounted.
  - Audio call and Video call buttons; Video off just disables the video track, so no renegotiation.
  - ICE servers come from getIceServers(), never hard-coded in the client. Use your own free TURN credentials in env.
  - Stop every track when a call ends so the camera and mic turn off.
- `useCall()` exposes startCall(patientId, targetUserId, { video }), endCall() and the call state.

**Before the demo:** Render's free tier sleeps when idle and the first connection can take close to a minute, so open the app on both phones a few minutes early.

**Done when:** a call connects between a phone on mobile data and one on Wi-Fi; Decline and End work from either side; a second call works without reloading; registering with a forged userId is rejected; calling someone outside the family fails at the ticket step.

**Why it is last:** calls do not move sugar or adherence, the core metrics, and they carry the most failure risk in a live demo. If you show it, show it after the core journey.

## Demo and what the team must own

The live demo is the journey from the first section, run on two phones (Ramesh and Rahul), ending on the doctor link.

**Numbers the app should be able to show for your metrics chain** (one SQL query each, no dashboard needed):

- Health outcome: change in fasting average and HbA1c per patient from the lab\_results and glucose\_readings tables.
- Leading behaviour: days per week with at least one log, and weekly adherence percent.
- Business: share of patients still logging at day 30 and day 90, compared against the case's 12% at 90 days.

**Owned by the team, not by an LLM:**

- The 5-page deck. Section 9 bans AI-generated or AI-edited deck text, structure, design and charts. Treat this plan's product choices as a starting point, then argue the beachhead, trade-offs, metrics and business model in your own words.
- The safety copy in lib/safety.ts. Write and review it yourselves, since it is what users read in a bad moment.
- A list of libraries and APIs used (Next.js, shadcn/ui, Drizzle, bcryptjs, Recharts, web-push, ws) to declare under Section 10.
- Being able to explain any file: each phase owner walks the rest of the team through their code before checkpoint 3.
