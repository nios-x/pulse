import { Lock } from "lucide-react";
import { Fruit, type FruitKind } from "@/components/fruits/fruit";
import { BADGES, type BadgeKey, type FruitKey } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function BadgeGrid({ badges }: { badges: { key: BadgeKey; earned: boolean }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {badges.map((b) => {
        const def = BADGES[b.key];
        return (
          <li key={b.key} className={cn("flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors", b.earned ? "border-fruit-orange/40 bg-fruit-orange-soft/60" : "border-dashed border-border-strong bg-surface/60")}>
            <span className={cn("relative flex size-16 items-center justify-center rounded-full", b.earned ? "bg-card shadow-soft" : "bg-muted")}>
              <Fruit kind={def.fruit as FruitKind} className={cn("size-11", !b.earned && "opacity-30 grayscale")} />
              {!b.earned && (
                <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden="true" />
                </span>
              )}
            </span>
            <span>
              <span className="block text-[0.9375rem] font-semibold">{def.title}</span>
              <span className="block text-sm text-muted-foreground">{def.description}</span>
            </span>
            <span className="sr-only">{b.earned ? "Earned" : "Locked"}</span>
          </li>
        );
      })}
    </ul>
  );
}

const FRUIT_LABEL: Record<FruitKey, string> = { orange: "Oranges", strawberry: "Strawberries", watermelon: "Watermelons", apple: "Apples", grapes: "Grapes", lemon: "Lemons", pear: "Pears" };
const FRUIT_FROM: Record<FruitKey, string> = { orange: "medicines", strawberry: "readings", watermelon: "water", apple: "walks", grapes: "fruit & veg", lemon: "sleep", pear: "mindful minutes" };

export function FruitBasket({ basket }: { basket: Record<FruitKey, number> }) {
  return (
    <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
      {(Object.keys(basket) as FruitKey[]).map((k) => (
        <li key={k} className="flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 py-3 text-center">
          <Fruit kind={k} className="size-10" />
          <span className="font-heading text-xl font-extrabold tabular">{basket[k]}</span>
          <span className="text-xs leading-tight text-muted-foreground">{FRUIT_LABEL[k]}<br />from {FRUIT_FROM[k]}</span>
        </li>
      ))}
    </ul>
  );
}
