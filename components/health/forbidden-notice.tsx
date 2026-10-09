"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/health/empty-state";
import { useAccess } from "@/components/providers/access-provider";
import { buttonVariants } from "@/components/ui/button";
import type { Action } from "@/lib/permissions";

/** Full-page explanation when a role can't open a screen. */
export function ForbiddenNotice({ action, memberId }: { action: Action; memberId?: string }) {
  const { reason } = useAccess();
  return (
    <EmptyState
      icon={Lock}
      title="You can't open this with your current role"
      description={reason(action, memberId) ?? "Ask your family admin for access."}
      action={<Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>Back to the dashboard</Link>}
    />
  );
}
