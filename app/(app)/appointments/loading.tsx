import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading appointments">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-11 w-96 max-w-full rounded-full" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );
}
