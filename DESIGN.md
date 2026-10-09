# Pulse design system

Calm, warm and clinical-but-human. Not a blue hospital template and not a busy dashboard: lots of whitespace, rounded-xl cards with subtle borders, and one clear primary action per screen.

All tokens live in `app/globals.css` as CSS variables (light in `:root`, dark in `.dark`), exposed to Tailwind through `@theme inline`. Components never use hex values.

## Colour tokens

| Token | Light | Use |
| --- | --- | --- |
| `background` | warm off-white `oklch(0.982 0.006 85)` | Page |
| `card` / `surface` | near white / warm grey | Cards, wells |
| `foreground` | deep slate `oklch(0.255 0.028 256)` | Text |
| `muted-foreground` | slate grey | Secondary text (≥ 4.5:1) |
| `primary` / `primary-strong` | sage-teal `oklch(0.49 0.075 182)` | The screen's one primary action, active nav, focus ring |
| `accent` / `primary-soft` | pale sage | Selected chips, active nav background |
| `border` / `border-strong` | warm hairlines | Card borders (instead of heavy shadows) |
| `success` `warning` `danger` (+ `-soft`, `-border`) | green / amber / red | **Health status only**, always with an icon and a word |
| `info` | slate blue | Neutral information ("Due now") |
| `role-admin/caregiver/member/viewer` (+ `-soft`) | teal / violet / blue / grey | Role badges, always with the role name |
| `avatar-1…6`, `avatar-ink` | soft tints | Member initials |
| `emergency` | deep red | Emergency card header and border only |
| `chart-1…5`, `chart-band` | | Chart lines; translucent green band for the usual range |

Red is never a brand colour.

## Type

Geist (via `next/font`). Body is 16px with 1.625 line height; meta text never drops below 14px.

| Role | Size |
| --- | --- |
| Page title | 28–32px semibold, −0.015em |
| Section title | 20px semibold |
| Card title | 18px semibold |
| Body | 16px |
| Meta / labels | 14–15px |
| Emergency card | 20–52px bold |

## Spacing and shape

4px grid. Cards `rounded-xl` with `p-5 sm:p-6`, page sections `gap-8`. Radius base 12px. Shadows are reserved for floating layers (`shadow-pop`).

## Motion

150–200ms colour and transform transitions (`--ease-out-soft`), a 200ms `animate-rise` on page entry, and a gentle `animate-shimmer` for skeletons. `prefers-reduced-motion` turns all of it off.

## Accessibility

- 44px minimum touch targets (`Button` default is 44px; icon buttons 40–44px)
- Visible focus rings on every interactive element (`:focus-visible` outline in `primary`)
- Status is never colour alone: `StatusBadge` always pairs an icon with a label, e.g. "High · 150/95"
- Disabled actions explain themselves: `RoleGate` shows a lock and a tooltip with the reason, and is keyboard-focusable
- Charts have a text summary for screen readers and a table view toggle
- Plain-language copy; "Not a diagnosis. Consult a doctor." wherever values are interpreted
- Skip link, landmarks, labelled forms with inline errors, live regions for async results

## Core components (`components/health`)

`MemberCard`, `MemberAvatar`, `VitalChart`, `VitalDialog`, `DoseItem`, `DoseList`, `RoleGate`, `RoleBadge`, `StatusBadge`, `EmptyState`, `SafetyNote`, `PageHeader`, `AlertList`, `MedicationCard`, `InteractionPanel`, `AppointmentItem`, `RecordTimeline`, `EmergencyCard`.

Every screen has a loading skeleton (`loading.tsx`), an empty state with a primary action, an error boundary (`error.tsx`) and success toasts (sonner). Layout is a sidebar on desktop and a bottom tab bar on mobile.
