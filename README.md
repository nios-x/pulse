# Pulse

Hindi-first chronic care web app for Type 2 diabetes patients in India and their family. Mobile-first PWA built from `implememtation.md`, phases 0 to 11.

## Run it

```bash
bun install
docker run -d --name pulse-db -e POSTGRES_USER=pulse -e POSTGRES_PASSWORD=pulse -e POSTGRES_DB=pulse -p 5433:5432 postgres:16-alpine
cp .env.example .env          # DATABASE_URL=postgres://pulse:pulse@localhost:5433/pulse
bun run db:migrate
bun run db:demo-seed          # 60 days of synthetic data (or db:seed for 7 days)
bun run dev                   # http://localhost:3000
```

Demo accounts (password `demo1234`), all synthetic:

| Who | Email | Role |
| --- | --- | --- |
| Ramesh Sharma (Papa) | ramesh@pulse.demo | Patient (owner) |
| Rahul Sharma (son) | rahul@pulse.demo | Caregiver |
| Sunita Sharma (Maa) | maa@pulse.demo | Family |

## Push reminders (phase 10)

`.env` needs VAPID keys (`npx web-push generate-vapid-keys`) and a `CRON_SECRET`. Each user turns on **Medicine reminders** in the menu. Then call the reminder job every 15 minutes from Vercel Cron or any scheduler:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/reminders
```

The patient gets "Time for Metformin" at each dose time. Caregivers, and family members with the meds scope, get "Papa hasn't taken the 8 am dose" an hour later if it is still not ticked. `sent_reminders` stops duplicates, so running it more often is safe.

## Family calls (phase 11)

Audio and video calls between members of the same family, peer to peer over WebRTC. `signaling/server.ts` relays the call setup; it is its own small Node service:

```bash
bun run signaling:dev            # local, port 8080, reads SIGNALING_SECRET from .env
```

For production, deploy `signaling/` alone (for example with `render.yaml` on Render) with the same `SIGNALING_SECRET`, and set `NEXT_PUBLIC_SIGNALING_URL=wss://<signaling-host>` on the app. Add your own TURN server (`TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`) so calls connect between mobile data and Wi-Fi. Render's free tier sleeps when idle, so open the app on both phones a few minutes before a demo.

Only logged-in users can register (signed 10-minute token), only members of the same family get a call ticket (signed, 60 seconds), and every call uses a fresh peer connection. Calls are recorded in `call_logs`.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` / `build` / `start` | Next.js |
| `bun run test` | Vitest unit tests for `lib/` (permissions, safety, adherence, insights) |
| `bun run db:generate` / `db:migrate` / `db:studio` | drizzle-kit |
| `bun run db:seed` | 3 users, 1 patient, 3 medicines, 7 days of logs |
| `bun run signaling:dev` | The call signaling server on port 8080 |
| `bun run db:demo-seed` | 60 days for the live demo: rice-dinner pattern, missed-dose streak, one high reading, two HbA1c |

## Where things live

- `lib/permissions.ts`: roles, scopes, `can()` and `requirePermission()` (the real gate, 403 via `forbidden()`).
- `lib/safety.ts`: fixed safety rules and all safety copy (English and Hindi). The Hindi copy is a draft for the team to review.
- `lib/insights.ts`, `lib/adherence.ts`: plain averages and dose bookkeeping, pure and tested.
- `lib/i18n.ts` + `messages/en.json`, `messages/hi.json`: every UI string; Hindi is the default.
- `app/share/[token]`: the doctor summary, no login, prints on one A4 page.

All times are India time (`lib/dates.ts`).
