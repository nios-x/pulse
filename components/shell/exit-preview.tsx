"use client";

import { useTransition } from "react";
import { setViewAs } from "@/app/actions/session";

export function ExitPreviewButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => setViewAs(null))}
      disabled={pending}
      className="min-h-9 cursor-pointer rounded-md px-2 font-semibold underline underline-offset-4 hover:no-underline"
    >
      Exit preview
    </button>
  );
}
