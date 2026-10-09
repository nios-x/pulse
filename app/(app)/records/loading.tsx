import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading records">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-20 rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
    </div>
  );
}
