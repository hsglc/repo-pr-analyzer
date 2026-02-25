"use client";

function ShimmerBar({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded ${className || ""}`} />;
}

export function RepoCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBar className="h-5 w-32" />
        <ShimmerBar className="h-5 w-16 rounded-full" />
      </div>
      <div className="mb-3 space-y-2">
        <ShimmerBar className="h-4 w-full" />
        <ShimmerBar className="h-4 w-2/3" />
      </div>
      <div className="flex items-center gap-3">
        <ShimmerBar className="h-3 w-20" />
        <ShimmerBar className="h-3 w-24" />
      </div>
    </div>
  );
}

export function RepoCardSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3" role="status">
      {Array.from({ length: 6 }).map((_, i) => (
        <RepoCardSkeleton key={i} />
      ))}
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}

export function PRListSkeleton() {
  return (
    <div className="space-y-3" role="status">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm"
        >
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <ShimmerBar className="h-4 w-10" />
              <ShimmerBar className="h-5 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <ShimmerBar className="h-3 w-24" />
              <ShimmerBar className="h-3 w-20" />
            </div>
          </div>
          <ShimmerBar className="ml-4 h-9 w-24 rounded-lg" />
        </div>
      ))}
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <ShimmerBar className="h-6 w-48" />
          <ShimmerBar className="h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          <ShimmerBar className="h-4 w-full" />
          <ShimmerBar className="h-4 w-3/4" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerBar key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShimmerBar className="h-4 w-12" />
                <ShimmerBar className="h-5 w-48" />
              </div>
              <ShimmerBar className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" role="status">
      <div className="rounded-xl bg-[var(--color-bg-primary)] p-4 shadow-sm">
        <ShimmerBar className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <ShimmerBar className="h-3 w-3 rounded-full" />
              <ShimmerBar className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--color-bg-primary)] p-6 shadow-sm">
        <ShimmerBar className="mb-4 h-5 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <ShimmerBar className="mb-1 h-4 w-24" />
              <ShimmerBar className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}

export function ConfigSkeleton() {
  return (
    <div className="mx-auto max-w-4xl" role="status">
      <div className="mb-6">
        <ShimmerBar className="h-4 w-24" />
        <ShimmerBar className="mt-2 h-7 w-64" />
        <ShimmerBar className="mt-1 h-4 w-32" />
      </div>
      <div className="rounded-xl bg-[var(--color-bg-primary)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <ShimmerBar className="h-5 w-32" />
          <ShimmerBar className="h-8 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border border-[var(--color-border)] p-3">
              <ShimmerBar className="h-4 w-32" />
              <ShimmerBar className="mt-2 h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}
