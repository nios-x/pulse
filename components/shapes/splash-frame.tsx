import type { ReactNode } from "react";
import { BlobBadge, Leaf, PulseMark, WaveField } from "@/components/shapes/shapes";
import { cn } from "@/lib/utils";

/**
 * The splash composition used before you are inside the app (sign-in, invites):
 * a violet wave field with leaves, and a white sheet rising over it with a badge on its edge.
 */
export function SplashFrame({
  brand,
  badge,
  children,
  className,
}: {
  brand: string;
  badge: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-violet">
      <div className="absolute inset-x-0 top-0 h-[46dvh]">
        <WaveField seed={3} edge={false} />
        <Leaf seed={9} className="drift absolute top-[16%] -right-10 w-44 text-mint/90" />
        <Leaf seed={5} veins={false} className="absolute -top-6 left-[38%] w-16 text-white/15" />
      </div>

      <header className="relative mx-auto flex w-full max-w-md items-center gap-3 px-5 pt-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-white shadow-violet">
          <PulseMark className="size-9" />
        </span>
        <span className="font-heading text-xl font-bold text-white">{brand}</span>
      </header>

      <main
        className={cn(
          "settle relative mx-auto mt-[16dvh] flex min-h-[calc(84dvh-4.5rem)] w-full max-w-md flex-col rounded-t-[2rem] bg-card px-5 pt-14 pb-8 shadow-lift",
          className
        )}
      >
        <BlobBadge
          seed={17}
          tone="white"
          className="absolute -top-10 left-1/2 size-20 -translate-x-1/2 drop-shadow-[0_10px_18px_rgb(45_12_87/0.25)]"
        >
          {badge}
        </BlobBadge>
        {children}
      </main>
    </div>
  );
}
