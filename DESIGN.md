# Pulse design system: "Market"

Pulse looks like a friendly grocery app: violet brand fields with organic SVG shapes, one mint-green action per screen, plum ink on a lavender-grey ground, and borderless white cards. It is warm and a little playful, but never at the cost of readability for older Hindi-first readers.

Tokens live in `app/globals.css`. Shapes live in `components/shapes/`.

## Color

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Brand | `violet` / `primary` | #7b3ff2 | Brand fields, active nav, links, focus rings, selected states |
| Brand deep | `violet-deep` | #5b21d6 | Text on lavender, hover |
| Brand soft | `violet-soft` | #a57bff | Decorative blobs only |
| Wash | `violet-wash` / `well` | #f1eaff | Icon wells, trays, segmented tracks |
| Lilac | `lilac` | #e2cbff | Selected chips and pills, active-nav pebble, text selection |
| Ink | `plum` / `ink` / `foreground` | #2d0c57 | Headings and body text |
| Ink 2 / 3 | `ink-2`, `ink-3` | #5e4c7d, #6f6188 | Secondary text, meta (both ≥ 4.5:1 on white and on the ground) |
| Ground | `background` | #f6f5fa | Page |
| Card | `card` / `sheet` | #ffffff | Cards, with `shadow-card` and no border |
| Go | `go` | #07874f | The screen's one primary action (default `Button`); white text is 4.58:1 |
| Mint | `mint`, `mint-soft`, `mint-wash` | #0bce83 … | Leaves and decoration only, never text on white |
| Status | `ok*`, `watch*`, `alert*` | green / amber / red, each with `-ink` and `-wash` | Health states, always icon plus words |

Danger stays loud: alerts and the glucose alert screen use `alert` red, never violet.

## Type

- **Poppins** (`font-heading`): h1–h3, buttons, numbers (`.figure`), nav labels. h1 is bold plum, −0.02em; page titles are `text-[2rem]`.
- **Mukta** (`font-sans`): body text. It reads better in long Devanagari passages.
- Buttons are sentence case. Uppercase is reserved for the small `.action-link` ("CHANGE"-style) and the brand eyebrow in the header.

## Shape and depth

- Radius base is 10px. Cards use `rounded-xl` or `rounded-2xl`, buttons `rounded-lg`, chips, search fields and segmented controls `rounded-full`, bottom sheets `rounded-t-[2rem]`.
- Depth comes from soft plum-tinted shadows (`shadow-card`, `shadow-lift`), plus colored `shadow-go` and `shadow-violet` under filled CTAs. No hairline borders on cards.

## Pattern kit (`components/shapes`)

All shapes are seeded, so server and client render identical SVG. They are colored with `text-*` (fill = currentColor) and hidden from screen readers.

- `Blob`: soft pebble. Used behind active nav icons, avatars and badges.
- `Leaf`: ruffled mint leaf with veins. This is the corner motif.
- `CornerLeaf`: the leaf and a lilac pebble, top-right of every app screen.
- `WaveField`: violet field with drifting pebbles. Used in the splash, the menu sheet header, and the hero cards (meds adherence, insights link).
- `BlobBadge`: an icon on a pebble, replacing plain icon circles.
- `PebbleScatter`: quiet scatter for empty states.
- `PulseMark`: logo (heartbeat on a violet pebble, mint dot).
- `SplashFrame`: the pre-app composition (violet field, white sheet rising, badge on its edge), used by `/auth` and `/join/[code]`.

Use one violet field per screen at most. Leaves sit at edges and corners, never behind text.

## Components

- `Button` variants: `default` (go green), `brand` (violet), `secondary` (violet wash), `outline` (white, lavender border), `ghost`, `destructive`, `link`. Sizes `touch` (48px) and `xl` (56px) for anything a patient taps.
- `TextField`: the label sits inside the outlined box (card-form style); the focus ring is violet at 15%.
- `ChoiceChips`: `pill` (lilac when selected, check icon in free-flow rows) or `tile` (food grid: white card, violet outline and corner check when picked).
- `Tabs` and the language switch: a violet-wash track with a white active thumb.
- Bottom nav: white bar with rounded top; the active item gets a lilac pebble behind a violet icon.
- Dose rows: product-card layout (pebble icon, name and dose, green "Taken" button). A due dose gets an amber ring; a taken dose sits on mint wash.

## Motion

- `.settle`: cards and sheets ease up 6px on first paint, from an already-visible state.
- `.drift`: slow float on leaves and pebbles.
- Both stop under `prefers-reduced-motion`. State changes use `ease-out-expo` at 200–300ms.
