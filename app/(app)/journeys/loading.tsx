import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading journeys">
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[26rem] w-full rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}
