import { Flame, Sparkles, type LucideIcon } from "lucide-react";
import { QUEST_ICON } from "@/components/game/quest-icons";
import type { JourneyKey } from "@/lib/journeys";

/** One line icon per journey; the habit roads share their quest's icon. */
export const JOURNEY_ICON: Record<JourneyKey, LucideIcon> = {
  level: Sparkles,
  streak: Flame,
  meds: QUEST_ICON.meds,
  water: QUEST_ICON.water,
  walk: QUEST_ICON.walk,
  vital: QUEST_ICON.vital,
  sleep: QUEST_ICON.sleep,
  produce: QUEST_ICON.produce,
};
