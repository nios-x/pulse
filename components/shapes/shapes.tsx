import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { blobPath, frillPath, veinPaths, wavePath } from "@/components/shapes/paths";

// The world's pattern kit: organic SVG shapes, coloured with text-* classes
// (fill="currentColor"), always decorative and hidden from screen readers.

type ShapeProps = { seed?: number; className?: string; style?: CSSProperties };

/** A soft pebble. */
export function Blob({ seed = 1, wobble, className, style }: ShapeProps & { wobble?: number }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden focusable="false" className={cn("pointer-events-none", className)} style={style}>
      <path d={blobPath(seed, { wobble })} fill="currentColor" />
    </svg>
  );
}

/** A ruffled leaf with veins, like the lettuce in the corner of a grocery aisle. */
export function Leaf({ seed = 4, className, style, veins = true }: ShapeProps & { veins?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden focusable="false" className={cn("pointer-events-none", className)} style={style}>
      <path d={frillPath(seed)} fill="currentColor" />
      <path d={frillPath(seed + 11, { lobes: 11, depth: 0.12 })} fill="white" opacity={0.16} transform="translate(30 30) scale(0.7)" />
      {veins
        ? veinPaths(seed).map((d) => (
            <path key={d} d={d} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={2.5} strokeLinecap="round" />
          ))
        : null}
    </svg>
  );
}

/**
 * The violet field: a wave-edged band with drifting pebbles. Fills its positioned parent.
 * `edge` draws the wavy lower edge; without it the field is a full rectangle.
 */
export function WaveField({ seed = 7, className, edge = true }: ShapeProps & { edge?: boolean }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 size-full text-violet">
        <path d={edge ? wavePath(seed, 400, 200, 14) : "M0 0H400V200H0Z"} fill="currentColor" />
      </svg>
      <Blob seed={seed + 1} wobble={0.24} className="drift absolute -top-[30%] -right-[18%] w-[70%] text-violet-soft/45" />
      <Blob seed={seed + 2} wobble={0.2} className="absolute top-[38%] -left-[22%] w-[48%] text-violet-deep/40" />
      <Blob seed={seed + 3} className="drift absolute top-[18%] left-[46%] w-[9%] text-white/20 [animation-delay:-3s]" />
    </div>
  );
}

/** A corner cluster for page headers: one big leaf with a pebble tucked under it. */
export function CornerLeaf({ seed = 4, className }: ShapeProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute -top-14 -right-16 size-48", className)}>
      <Blob seed={seed + 20} wobble={0.22} className="absolute top-16 right-24 w-20 text-lilac" />
      <Leaf seed={seed} className="drift absolute inset-0 text-mint" />
    </div>
  );
}

/** An icon set on a pebble instead of a plain circle. */
export function BlobBadge({
  children,
  seed = 3,
  tone = "violet",
  className,
}: {
  children: ReactNode;
  seed?: number;
  tone?: "violet" | "mint" | "white" | "alert";
  className?: string;
}) {
  const fill = {
    violet: "text-violet-wash",
    mint: "text-mint-wash",
    white: "text-white",
    alert: "text-alert-wash",
  }[tone];
  const ink = {
    violet: "text-violet-deep",
    mint: "text-go",
    white: "text-plum",
    alert: "text-alert-ink",
  }[tone];
  return (
    <span className={cn("relative inline-flex size-16 shrink-0 items-center justify-center", ink, className)}>
      <Blob seed={seed} wobble={0.14} className={cn("absolute inset-0 size-full", fill)} />
      <span className="relative flex size-full items-center justify-center [&_svg]:size-[42%]">{children}</span>
    </span>
  );
}

/** A loose scatter of pebbles, for quiet empty areas. */
export function PebbleScatter({ seed = 30, className }: ShapeProps) {
  const spots = [
    { x: 6, y: 18, s: 14, c: "text-lilac" },
    { x: 78, y: 6, s: 22, c: "text-mint-wash" },
    { x: 88, y: 62, s: 10, c: "text-violet-soft/40" },
    { x: 20, y: 70, s: 8, c: "text-mint-soft/60" },
  ];
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {spots.map((p, i) => (
        <Blob
          key={i}
          seed={seed + i}
          className={cn("absolute", p.c)}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.s}%` }}
        />
      ))}
    </div>
  );
}

/** The Pulse mark: a heart-beat line on a violet pebble. */
export function PulseMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-11 shrink-0 items-center justify-center text-white", className)}>
      <Blob seed={12} wobble={0.1} className="absolute inset-0 size-full text-violet" />
      <svg viewBox="0 0 24 24" aria-hidden className="relative size-[55%]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12.5h4l2-4.5 3.5 9 2.5-5.5H21" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-mint ring-2 ring-white" />
    </span>
  );
}
