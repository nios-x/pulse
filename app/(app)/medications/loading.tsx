import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading medicines">
      <Skeleton className="h-10 w-60" />
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[28rem] rounded-xl" />
        <Skeleton className="h-[28rem] rounded-xl" />
      </div>
    </div>
  );
}
