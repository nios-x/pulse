"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import { unreadAlertCountAction } from "@/app/(app)/p/[patientId]/alerts/actions";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

/** Unread alert count: fresh on every page load, then refreshed every 30 seconds. */
export function AlertBell({ patientId, initialCount }: { patientId: string; initialCount: number }) {
  const t = useT();
  const [count, setCount] = useState(initialCount);
  // A fresh server count (page load or refresh) replaces the polled one.
  const [serverCount, setServerCount] = useState(initialCount);
  if (initialCount !== serverCount) {
    setServerCount(initialCount);
    setCount(initialCount);
  }
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        setCount(await unreadAlertCountAction({ patientId }));
      } catch {
        // Offline or signed out: keep the last count.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [patientId]);

  return (
    <Link
      href={`/p/${patientId}/alerts`}
      aria-label={count ? t("alerts.bellUnread", { count }) : t("alerts.bell")}
      className="relative flex size-11 items-center justify-center rounded-lg hover:bg-muted"
    >
      <BellIcon className={cn("size-6", count > 0 && "text-destructive")} aria-hidden />
      {count > 0 ? (
        <span className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
