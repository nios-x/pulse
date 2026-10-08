import { PhoneIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CallItem = { label: string; number: string; hint?: string; primary?: boolean };

/** Big tel: buttons. Works on the server and the client. */
export function CallList({ items, className }: { items: CallItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <li key={`${item.label}-${item.number}`}>
          <a
            href={`tel:${item.number.replace(/[^\d+]/g, "")}`}
            className={buttonVariants({
              size: "xl",
              variant: item.primary ? "default" : "outline",
              className: "h-auto min-h-16 w-full justify-start py-2 text-left whitespace-normal",
            })}
          >
            <PhoneIcon aria-hidden />
            <span className="flex flex-col">
              <span>{item.label}</span>
              {item.hint ? <span className="text-sm font-normal opacity-80">{item.hint}</span> : null}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
