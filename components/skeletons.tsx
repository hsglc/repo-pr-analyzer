"use client";

export function RepoCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--color-bg-tertiary)]" />
      </div>
      <div className="mb-3 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
      </div>
    </div>
  );
}

export function RepoCardSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="status">
      {Array.from({ length: 6 }).map((_, i) => (
        <RepoCardSkeleton key={i} />
      ))}
      <span className="sr-only">Yukleniyor...</span>
    </div>
  );
}

export function PRListSkeleton() {
  return (
    <div className="space-y-3" role="status">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm"
        >
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-4 w-10 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="h-5 w-64 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
          </div>
          <div className="ml-4 h-9 w-24 animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]" />
        </div>
      ))}
      <span className="sr-only">Yukleniyor...</span>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-48 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--color-bg-tertiary)]" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between border-b border-[var(--color-border)] py-2">
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-12 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
                <div className="h-5 w-48 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Yukleniyor...</span>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" role="status">
      <div className="rounded-lg bg-[var(--color-bg-primary)] p-4 shadow-sm">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-bg-tertiary)]" />
              <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-[var(--color-bg-primary)] p-6 shadow-sm">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-4 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Yukleniyor...</span>
    </div>
  );
}

export function ConfigSkeleton() {
  return (
    <div className="mx-auto max-w-4xl" role="status">
      <div className="mb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="mt-2 h-7 w-64 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="mt-1 h-4 w-32 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
      </div>
      <div className="rounded-lg bg-[var(--color-bg-primary)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-8 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border border-[var(--color-border)] p-3">
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="mt-2 h-8 w-full animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Yukleniyor...</span>
    </div>
  );
}
