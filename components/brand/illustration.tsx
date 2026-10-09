import Image from "next/image";
import { cn } from "@/lib/utils";

/** Free IconScout illustrations (IconScout Store, no attribution required) in `public/images/illustrations`. */
const ILLUSTRATIONS = {
  records: { width: 1200, height: 900 },
  medicines: { width: 1200, height: 900 },
  appointments: { width: 1200, height: 900 },
  patients: { width: 1200, height: 900 },
  welcome: { width: 1200, height: 900 },
  "not-found": { width: 650, height: 512 },
  error: { width: 650, height: 512 },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/** Decorative only: the text next to it carries the meaning. */
export function Illustration({ name, className, priority }: { name: IllustrationName; className?: string; priority?: boolean }) {
  const { width, height } = ILLUSTRATIONS[name];
  return (
    <Image
      src={`/images/illustrations/${name}.svg`}
      alt=""
      width={width}
      height={height}
      priority={priority}
      className={cn("pointer-events-none h-auto w-full select-none", className)}
    />
  );
}
