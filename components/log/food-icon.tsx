import {
  AppleIcon,
  CandyIcon,
  CoffeeIcon,
  CookingPotIcon,
  DonutIcon,
  EggFriedIcon,
  LeafyGreenIcon,
  MilkIcon,
  SaladIcon,
  SandwichIcon,
  SoupIcon,
  UtensilsIcon,
  WheatIcon,
  type LucideIcon,
} from "lucide-react";
import type { FoodKey } from "@/lib/foods";

const FOOD_ICONS: Record<FoodKey, LucideIcon> = {
  roti: WheatIcon,
  rice: CookingPotIcon,
  paratha: SandwichIcon,
  dal: SoupIcon,
  sabzi: LeafyGreenIcon,
  poha: SaladIcon,
  curd: MilkIcon,
  egg_meat: EggFriedIcon,
  fruit: AppleIcon,
  sweets: CandyIcon,
  chai_sugar: CoffeeIcon,
  fried_snack: DonutIcon,
};

export function FoodIcon({ food, className }: { food: string; className?: string }) {
  const Icon = FOOD_ICONS[food as FoodKey] ?? UtensilsIcon;
  return <Icon className={className} aria-hidden />;
}
