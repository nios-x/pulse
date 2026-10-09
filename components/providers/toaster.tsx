"use client";

import { Toaster as Sonner } from "sonner";
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";

/** Success, error and info toasts, styled with the theme tokens. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      duration={4000}
      icons={{
        success: <CircleCheck className="size-5 text-success" aria-hidden />,
        error: <OctagonAlert className="size-5 text-danger" aria-hidden />,
        warning: <TriangleAlert className="size-5 text-warning" aria-hidden />,
        info: <Info className="size-5 text-info" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-pop !text-base !gap-3 !py-3.5 !px-4 !font-sans",
          description: "!text-muted-foreground !text-sm",
          closeButton: "!bg-popover !border-border !text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md !h-9 !px-3 !text-sm",
        },
      }}
      className="max-sm:!bottom-24"
    />
  );
}
