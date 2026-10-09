import { Brain, Footprints, GlassWater, HeartPulse, Moon, Pill, Salad, type LucideIcon } from "lucide-react";
import type { TallyKey } from "@/lib/gamification";

/** One line icon per daily goal, shared by the quest list and the 90-day tally. */
export const QUEST_ICON: Record<TallyKey, LucideIcon> = {
  meds: Pill,
  vital: HeartPulse,
  water: GlassWater,
  walk: Footprints,
  produce: Salad,
  sleep: Moon,
  mindful: Brain,
};
