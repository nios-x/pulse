import { CalendarCheck, CalendarRange, Flag, Flame, Flower2, Footprints, GlassWater, HeartPulse, Lock, Moon, Pill, Salad, Trophy, type LucideIcon } from "lucide-react";
import { QUEST_ICON } from "@/components/game/quest-icons";
import { BADGES, type BadgeKey, type TallyKey } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const BADGE_ICON: Record<BadgeKey, LucideIcon> = {
  first_steps: Flag,
  streak_3: Flame,
  streak_7: CalendarCheck,
  streak_14: CalendarRange,
  streak_30: Trophy,
  perfect_week: Pill,
  hydration_hero: GlassWater,
  walker: Footprints,
  vitals_pro: HeartPulse,
  green_plate: Salad,
  sleep_champ: Moon,
  pcos_warrior: Flower2,
};

export function BadgeGrid({ badges }: { badges: { key: BadgeKey; earned: boolean }[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {badges.map((b) => {
        const def = BADGES[b.key];
        const Icon = BADGE_ICON[b.key];
        return (
          <li key={b.key} className="flex items-center gap-3 border-b border-border py-3">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", b.earned ? "bg-brand-soft text-brand" : "border border-dashed border-border-strong text-muted-foreground")}>
              {b.earned ? <Icon className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[0.9375rem] font-medium", !b.earned && "text-muted-foreground")}>{def.title}</span>
              <span className="block text-sm text-muted-foreground">{def.description}</span>
            </span>
            <span className="sr-only">{b.earned ? "Earned" : "Locked"}</span>
          </li>
        );
      })}
    </ul>
  );
}

const TALLY_LABEL: Record<TallyKey, string> = {
  meds: "All medicines",
  vital: "Readings",
  water: "Water goal",
  walk: "Walks",
  produce: "Fruit & veg",
  sleep: "Good sleep",
  mindful: "Mindful minutes",
};

export function HabitTally({ tally }: { tally: Record<TallyKey, number> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
      {(Object.keys(tally) as TallyKey[]).map((k) => {
        const Icon = QUEST_ICON[k];
        return (
          <div key={k} className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {TALLY_LABEL[k]}
            </dt>
            <dd className="font-heading text-2xl font-semibold tabular">
              {tally[k]}
              <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">day{tally[k] === 1 ? "" : "s"}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
