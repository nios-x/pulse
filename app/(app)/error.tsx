"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/health/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      illustration="error"
      title="Something went wrong loading this page"
      description={`Your information is safe. Please try again.${error.digest ? ` (Reference: ${error.digest})` : ""}`}
      action={<Button onClick={() => reset()}><RotateCcw aria-hidden="true" /> Try again</Button>}
    />
  );
}
