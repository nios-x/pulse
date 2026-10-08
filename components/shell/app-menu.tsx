"use client";

import type { ReactNode } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/components/i18n-provider";

/** Header menu. Items are rendered on the server and passed in as children. */
export function AppMenu({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-touch" aria-label={t("menu.open")} />}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-xs gap-0" closeLabel={t("common.close")}>
        <SheetHeader>
          <SheetTitle className="text-lg">{t("menu.title")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-3 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
