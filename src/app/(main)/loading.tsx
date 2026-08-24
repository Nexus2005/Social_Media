export default function Loading() {
  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto px-4 sm:px-2 py-0 sm:pt-2 sm:pb-6 gap-6 animate-pulse">
      {/* Stories row skeleton */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="size-[76px] rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-8 border-b border-instagram-lightBorder dark:border-instagram-darkBorder pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>

      {/* Feed post skeletons */}
      <div className="space-y-6 max-w-[600px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="size-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-40 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
