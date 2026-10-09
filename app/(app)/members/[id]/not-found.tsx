import Link from "next/link";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/health/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function MemberNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="This profile isn't available"
      description="It may have been removed, or your role doesn't include this person."
      action={<Link href="/dashboard" className={buttonVariants()}>Back to the family dashboard</Link>}
    />
  );
}
