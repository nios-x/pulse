# Pulse design system

Fresh, friendly and a little playful, like a good grocery app: a violet brand, leaf-green "go" buttons, lilac selections and fruit illustrations that reward progress. Health status stays sober and clear. Lots of whitespace, rounded-2xl cards and one clear primary action per screen.

All tokens live in `app/globals.css` as CSS variables (light in `:root`, dark in `.dark`), exposed to Tailwind through `@theme inline`. Components never use hex values.

## Colour tokens

| Token | Light | Use |
| --- | --- | --- |
| `background` | lavender-white | Page |
| `card` / `surface` | white / pale lilac | Cards, wells |
| `foreground` | deep plum-slate | Text |
| `muted-foreground` | slate grey | Secondary text (≥ 4.5:1) |
| `brand` / `brand-soft` | violet `oklch(0.52 0.22 292)` | Heroes, auth panel, progress, secondary CTAs (`variant="brand"`) |
| `primary` / `primary-strong` | leaf green `oklch(0.52 0.145 155)` | The screen's one "go" action (`shadow-go`), focus ring |
| `accent` | lilac | Selected chips, active nav |
| `fruit-orange/berry/lemon/leaf/grape/water` (+ `-soft`) | | Quest tiles, fruit illustrations, badges. Decoration only, never status |
| `success` `warning` `danger` (+ `-soft`, `-border`) | green / amber / red | **Health status only**, always with an icon and a word |
| `info` | slate blue | Neutral information ("Due now") |
| `role-admin/caregiver/member/viewer` (+ `-soft`) | | Role badges, always with the role name |
| `avatar-1…6`, `avatar-ink` | soft tints | Member initials |
| `emergency` | deep red | Emergency card header and border only |
| `chart-1…5`, `chart-band` | violet first | Chart lines; translucent green band for the usual range |

Red is never a brand colour.

## Type

Headings in Plus Jakarta Sans (`font-heading`, bold/extrabold), body in Geist (via `next/font`). Body is 16px with 1.625 line height; meta text never drops below 14px.

| Role | Size |
| --- | --- |
| Page title | 28–32px semibold, −0.015em |
| Section title | 20px semibold |
| Card title | 18px semibold |
| Body | 16px |
| Meta / labels | 14–15px |
| Emergency card | 20–52px bold |

## Spacing and shape

4px grid. Cards `rounded-2xl` with `p-5 sm:p-6`, buttons `rounded-xl`, page sections `gap-8`. Radius base 12px. Shadows are reserved for floating layers (`shadow-pop`).

## Motion

150–200ms colour and transform transitions (`--ease-out-soft`), a 200ms `animate-rise` on page entry, a gentle `animate-shimmer` for skeletons, `animate-pop` when a quest completes, `animate-float` for fruit and `animate-flicker` for the streak flame. Confetti fires on completed quests and all-doses-taken. `prefers-reduced-motion` turns all of it off.

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

## Gamification (`components/game`, `components/fruits`)

- `Fruit` draws token-coloured SVG fruit (apple, orange, strawberry, watermelon, grapes, lemon, pear, cherry) and level plants (seed → harvest).
- `QuestList`: one row per quest with a fruit tile, progress bar and big +/− buttons (44px+). Completion is shown with a check and the word, not colour alone.
- `StreakFlame`, `LevelProgress`, `WeekStrip`, `BadgeGrid`, `FruitBasket`, `GraceDayButton`, `ProgressChart`, `PlanCard`.
- Everything is derived from real logs (`lib/gamification.ts`), so there's no points ledger to drift. Copy stays kind: missed days are never shamed, rest days protect a streak.
