"use client";

import { useEffect, useState } from "react";

interface Commit {
  sha: string;
  message: string;
  author: { login: string; avatarUrl: string };
  date: string;
}

export function CommitHistory({ owner, repo, prNumber }: { owner: string; repo: string; prNumber: number }) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/commits`
        );
        if (res.ok) {
          const data = await res.json();
          setCommits(data.commits || []);
        }
      } catch {
        // Non-critical
      }
      setLoading(false);
    }
    load();
  }, [owner, repo, prNumber]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="animate-shimmer h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1">
              <div className="animate-shimmer h-4 w-3/4 rounded mb-2" />
              <div className="animate-shimmer h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--color-text-muted)]">
        Commit bulunamadı.
      </div>
    );
  }

  return (
    <div className="relative py-4">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--color-border)]" />

      <div className="space-y-0">
        {commits.map((commit, i) => {
          const firstLine = commit.message.split("\n")[0];
          const hasMore = commit.message.includes("\n");

          return (
            <div key={commit.sha} className="relative flex gap-4 pb-6">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                {commit.author.avatarUrl ? (
                  <img
                    src={commit.author.avatarUrl}
                    alt={commit.author.login}
                    className="h-8 w-8 rounded-full ring-2 ring-[var(--color-bg-secondary)]"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-bg-secondary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4"/>
                      <line x1="1.05" y1="12" x2="7" y2="12"/>
                      <line x1="17.01" y1="12" x2="22.96" y2="12"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                  {firstLine}
                  {hasMore && (
                    <span className="text-[var(--color-text-muted)]"> ...</span>
                  )}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <code className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 font-mono">
                    {commit.sha.substring(0, 7)}
                  </code>
                  <span>{commit.author.login}</span>
                  {commit.date && (
                    <>
                      <span>·</span>
                      <span>{new Date(commit.date).toLocaleDateString("tr-TR")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Commit number */}
              <span className="shrink-0 pt-1 text-xs text-[var(--color-text-muted)]">
                #{commits.length - i}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
