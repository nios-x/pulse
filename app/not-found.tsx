import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/health/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
      <EmptyState
        className="w-full"
        icon={Compass}
        illustration="not-found"
        title="We couldn't find that page"
        description="The link may be old, or the page has moved."
        action={<Link href="/" className={buttonVariants()}>Go to Pulse</Link>}
      />
    </main>
  );
}
