"use client";

import type { ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/components/i18n-provider";
import { WaveField } from "@/components/shapes/shapes";

/** Header menu. Items are rendered on the server and passed in as children. */
export function AppMenu({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            aria-label={t("menu.open")}
            className="relative size-11 rounded-full bg-card text-plum shadow-card hover:bg-card"
          />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="w-[86vw] max-w-xs gap-0 overflow-hidden bg-background" closeLabel={t("common.close")}>
        <SheetHeader className="relative h-32 justify-end overflow-hidden px-5 pb-5">
          <WaveField seed={21} />
          <SheetTitle className="relative font-heading text-2xl font-bold text-white">{t("menu.title")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-3 pt-3 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
