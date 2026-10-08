# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (mobile-first PWA, installable; a desktop rail exists for caregivers on laptops)

## Users

Indian families living with Type 2 diabetes. The patient is usually an older parent (55–75) who reads Hindi first, uses a budget Android phone, and may have weak eyesight. Around them: an adult child who runs the family's health as caregiver (often in another city), other family members who help with doses and logging, and the family doctor, who only reads what is shared. Accounts are invite-only: every login is linked to one family by an invite code.

## Product Purpose

Pulse is daily sugar care for the whole family. The patient logs blood sugar, meals and medicine doses in a few taps; the family sees how today is going, gets nudged when a dose is missed or a reading is dangerous, and can call each other from the app. The doctor gets a one-page summary instead of a pile of WhatsApp photos. Success means doses taken on time, dangerous readings noticed within minutes, and a doctor visit that starts with real numbers.

## Positioning

A warm, family-run care app, not a clinical tracker or a fitness app. It speaks the family's language (Hindi first, English second), names foods the family actually eats, and never gives medical advice: it records, reminds, and connects people.

## Operating Context

- A phone in the patient's hand at the dining table, often in bright daylight or a dim room, sometimes read with reading glasses or by a family member.
- The caregiver glancing at the family's day between work tasks, from another city.
- Low-end Android devices, patchy mobile data, large system font sizes.
- Moments of worry: a very high or very low reading must be unmistakable and point straight to who to call.

## Capabilities and Constraints

- Capabilities: glucose and BP logging, meal logging with food chips and photo recognition (Gemini), medicine schedules and dose ticking, push reminders, alerts to caregivers, weekly mood check (PHQ-2), insights, doctor share links with a printable summary, doctor appointment booking, family audio/video calls, role-based access (owner, caregiver, family, doctor) with per-scope permissions, invite-only accounts.
- Technical stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/Base UI components, Drizzle + Postgres.
- Constraints: Hindi and English everywhere; 44px+ tap targets; 16px+ inputs; works before JavaScript where possible; no medical advice in copy; demo data must be labelled synthetic.

## Product Principles

- **Family first, patient centered:** every screen answers "how is Papa today?" for the family and "what do I do now?" for the patient.
- **One tap is the budget:** logging a reading or a dose must take one or two taps, with big targets and plain words.
- **Danger is never subtle:** urgent states break the calm visual rhythm on purpose; everything else stays friendly and quiet.
- **Hindi is not a translation:** layouts, type and line lengths are designed for Devanagari as the primary script.
- **Record, remind, connect; never prescribe.**
