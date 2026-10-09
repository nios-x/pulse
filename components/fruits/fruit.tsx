import { cn } from "@/lib/utils";

/**
 * Flat fruit and plant illustrations, coloured with theme tokens so they work in
 * light and dark. Decorative by default (aria-hidden); pass `label` to announce one.
 */

export type FruitKind =
  | "apple"
  | "orange"
  | "strawberry"
  | "watermelon"
  | "grapes"
  | "lemon"
  | "pear"
  | "cherry"
  | "leaf"
  | "seed"
  | "sprout"
  | "seedling"
  | "sapling"
  | "blossom"
  | "tree"
  | "orchard"
  | "harvest"
  | "drop";

const C = {
  orange: "var(--fruit-orange)",
  berry: "var(--fruit-berry)",
  lemon: "var(--fruit-lemon)",
  leaf: "var(--fruit-leaf)",
  grape: "var(--fruit-grape)",
  water: "var(--fruit-water)",
  ink: "var(--fruit-ink)",
  shine: "oklch(1 0 0 / 0.45)",
  stem: "oklch(0.45 0.07 60)",
  rind: "oklch(0.55 0.15 150)",
  flesh: "oklch(0.7 0.19 18)",
  pear: "oklch(0.82 0.15 115)",
  bark: "oklch(0.5 0.08 55)",
  pink: "oklch(0.85 0.09 350)",
};

function Leaf({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M0 0c6-6 15-6 18 0-3 6-12 6-18 0Z" fill={C.leaf} />;
}

const SHAPES: Record<FruitKind, React.ReactNode> = {
  apple: (
    <>
      <path d="M32 18c-6-5-20-4-20 12 0 14 9 24 15 24 3 0 3-2 5-2s2 2 5 2c6 0 15-10 15-24 0-16-14-17-20-12Z" fill={C.berry} />
      <path d="M32 18c0-4 1-8 4-11" stroke={C.stem} strokeWidth="3" strokeLinecap="round" fill="none" />
      <Leaf x={34} y={12} r={-25} />
      <ellipse cx="21" cy="28" rx="3" ry="6" fill={C.shine} />
    </>
  ),
  orange: (
    <>
      <circle cx="32" cy="35" r="20" fill={C.orange} />
      <circle cx="32" cy="35" r="20" fill="none" stroke="oklch(0 0 0 / 0.06)" strokeWidth="2" />
      <Leaf x={31} y={15} r={-20} />
      <circle cx="32" cy="16" r="2.5" fill={C.stem} />
      <ellipse cx="23" cy="28" rx="3.5" ry="6" fill={C.shine} />
    </>
  ),
  strawberry: (
    <>
      <path d="M32 56C20 46 12 36 13 27c1-7 9-9 19-7 10-2 18 0 19 7 1 9-7 19-19 29Z" fill={C.berry} />
      <path d="M20 19c4 2 8 2 12-2 4 4 8 4 12 2-2 5-7 6-12 4-5 2-10 1-12-4Z" fill={C.leaf} />
      {[[24, 30], [32, 28], [40, 30], [28, 38], [36, 38], [32, 46]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.2" ry="2" fill={C.lemon} />
      ))}
    </>
  ),
  watermelon: (
    <>
      <path d="M6 26a26 26 0 0 0 52 0Z" fill={C.rind} />
      <path d="M10 26a22 22 0 0 0 44 0Z" fill="oklch(0.95 0.05 140)" />
      <path d="M13 26a19 19 0 0 0 38 0Z" fill={C.flesh} />
      {[[22, 32], [32, 36], [42, 32], [27, 40], [37, 40]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.4" ry="2.4" fill={C.ink} />
      ))}
    </>
  ),
  grapes: (
    <>
      <path d="M32 14c0-4 2-7 5-9" stroke={C.stem} strokeWidth="3" strokeLinecap="round" fill="none" />
      <Leaf x={34} y={10} r={-15} s={0.9} />
      {[[24, 22], [34, 22], [44, 22], [19, 32], [29, 32], [39, 32], [24, 42], [34, 42], [29, 52]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="6.5" fill={C.grape} />
      ))}
      <circle cx="22" cy="20" r="2" fill={C.shine} />
    </>
  ),
  lemon: (
    <>
      <path d="M10 34c0-11 10-19 22-19s22 8 22 19-10 19-22 19S10 45 10 34Z" fill={C.lemon} />
      <path d="M8 34l4-3v6Zm48 0-4-3v6Z" fill={C.lemon} />
      <Leaf x={30} y={15} r={-30} s={0.8} />
      <ellipse cx="22" cy="28" rx="5" ry="3" fill={C.shine} />
    </>
  ),
  pear: (
    <>
      <path d="M32 14c-6 0-8 6-8 12 0 4-10 8-10 18 0 8 8 13 18 13s18-5 18-13c0-10-10-14-10-18 0-6-2-12-8-12Z" fill={C.pear} />
      <path d="M32 15c0-4 1-7 3-9" stroke={C.stem} strokeWidth="3" strokeLinecap="round" fill="none" />
      <Leaf x={34} y={9} r={-20} s={0.8} />
      <ellipse cx="24" cy="40" rx="3" ry="6" fill={C.shine} />
    </>
  ),
  cherry: (
    <>
      <path d="M22 42c4-14 8-24 18-32M42 44c-1-12-1-22-2-34" stroke={C.stem} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Leaf x={40} y={10} r={10} s={0.9} />
      <circle cx="21" cy="46" r="9" fill={C.berry} />
      <circle cx="43" cy="47" r="9" fill={C.berry} />
      <circle cx="18" cy="43" r="2" fill={C.shine} />
    </>
  ),
  leaf: (
    <>
      <path d="M10 54C10 26 28 10 56 10c0 28-16 44-46 44Z" fill={C.leaf} />
      <path d="M12 52C26 38 36 28 52 14" stroke="oklch(1 0 0 / 0.5)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  drop: (
    <>
      <path d="M32 8C24 20 16 30 16 40a16 16 0 0 0 32 0c0-10-8-20-16-32Z" fill={C.water} />
      <ellipse cx="25" cy="40" rx="3" ry="6" fill={C.shine} />
    </>
  ),
  seed: (
    <>
      <ellipse cx="32" cy="52" rx="20" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      <ellipse cx="32" cy="40" rx="9" ry="12" transform="rotate(20 32 40)" fill={C.bark} />
      <ellipse cx="29" cy="36" rx="2" ry="4" transform="rotate(20 29 36)" fill={C.shine} />
    </>
  ),
  sprout: (
    <>
      <ellipse cx="32" cy="54" rx="20" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      <path d="M32 54V36" stroke={C.rind} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 38c-10 0-14-6-14-12 9 0 14 4 14 12Zm0 0c10 0 14-6 14-12-9 0-14 4-14 12Z" fill={C.leaf} />
    </>
  ),
  seedling: (
    <>
      <ellipse cx="32" cy="55" rx="20" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      <path d="M32 55V24" stroke={C.rind} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 44c-11 0-15-6-15-13 10 0 15 5 15 13Zm0-10c11 0 15-6 15-13-10 0-15 5-15 13Zm0-8c-6 0-8-4-8-8 6 0 8 3 8 8Z" fill={C.leaf} />
    </>
  ),
  sapling: (
    <>
      <ellipse cx="32" cy="56" rx="20" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      <path d="M32 56V30" stroke={C.bark} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="24" r="14" fill={C.leaf} />
      <circle cx="22" cy="30" r="8" fill={C.leaf} />
      <circle cx="42" cy="30" r="8" fill={C.leaf} />
      <circle cx="27" cy="19" r="3" fill={C.shine} />
    </>
  ),
  blossom: (
    <>
      <ellipse cx="32" cy="57" rx="20" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      <path d="M32 57V32" stroke={C.bark} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="24" r="16" fill={C.leaf} />
      <circle cx="20" cy="31" r="9" fill={C.leaf} />
      <circle cx="44" cy="31" r="9" fill={C.leaf} />
      {[[26, 18], [38, 20], [32, 28], [20, 30], [45, 30]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill={C.pink} />
      ))}
    </>
  ),
  tree: (
    <>
      <ellipse cx="32" cy="58" rx="22" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      <path d="M32 58V32" stroke={C.bark} strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="22" r="17" fill={C.leaf} />
      <circle cx="18" cy="30" r="10" fill={C.leaf} />
      <circle cx="46" cy="30" r="10" fill={C.leaf} />
      {[[25, 17], [39, 18], [32, 28], [18, 31], [46, 31], [30, 10]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3.6" fill={C.berry} />
      ))}
    </>
  ),
  orchard: (
    <>
      <ellipse cx="32" cy="58" rx="28" ry="5" fill="oklch(0.6 0.08 60 / 0.35)" />
      {[[16, 0.75, C.orange], [48, 0.75, C.lemon], [32, 1, C.berry]].map(([x, s, c]) => (
        <g key={String(x)} transform={`translate(${x} 0) scale(${s}) translate(-32 ${s === 1 ? 0 : 18})`}>
          <path d="M32 58V34" stroke={C.bark} strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="24" r="16" fill={C.leaf} />
          {[[25, 20], [39, 21], [32, 30]].map(([fx, fy]) => <circle key={`${fx}${fy}`} cx={fx} cy={fy} r="3.6" fill={c as string} />)}
        </g>
      ))}
    </>
  ),
  harvest: (
    <>
      <path d="M8 34h48l-5 22H13Z" fill={C.bark} />
      <path d="M8 34h48" stroke="oklch(0.4 0.07 55)" strokeWidth="3" />
      <circle cx="20" cy="28" r="9" fill={C.berry} />
      <circle cx="34" cy="26" r="10" fill={C.orange} />
      <circle cx="46" cy="29" r="8" fill={C.lemon} />
      <circle cx="27" cy="20" r="6" fill={C.grape} />
      <Leaf x={34} y={14} r={-30} s={0.8} />
    </>
  ),
};

export function Fruit({ kind, className, label }: { kind: FruitKind; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10 shrink-0", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {SHAPES[kind]}
    </svg>
  );
}

/** A loose scatter of fruit for hero backgrounds. */
export function FruitScatter({ className }: { className?: string }) {
  const items: [FruitKind, string][] = [
    ["orange", "right-4 top-3 size-14 rotate-12"],
    ["strawberry", "right-24 top-14 size-9 -rotate-12"],
    ["leaf", "right-2 bottom-4 size-12 rotate-45"],
    ["grapes", "right-36 bottom-2 size-10 rotate-6"],
    ["lemon", "right-16 bottom-10 size-8 -rotate-6"],
  ];
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {items.map(([k, pos], i) => (
        <span key={k} className={cn("absolute motion-safe:animate-float", pos)} style={{ animationDelay: `${i * 0.8}s` }}>
          <Fruit kind={k} className="size-full drop-shadow-sm" />
        </span>
      ))}
    </div>
  );
}
