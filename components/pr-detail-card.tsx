"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";

interface PRDetails {
  title: string;
  body: string | null;
  state: string;
  merged: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  author: { login: string; avatarUrl: string };
  reviewers: { login: string; avatarUrl: string }[];
  mergeable: boolean | null;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  checkStatus: string | null;
}

const STATE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: "Açık", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
  closed: { label: "Kapalı", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  merged: { label: "Birleştirildi", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
};

const CHECK_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  success: { label: "Başarılı", icon: "✓", color: "text-green-600 dark:text-green-400" },
  failure: { label: "Başarısız", icon: "✗", color: "text-red-600 dark:text-red-400" },
  pending: { label: "Beklemede", icon: "○", color: "text-yellow-600 dark:text-yellow-400" },
};

export function PRDetailCard({ owner, repo, prNumber }: { owner: string; repo: string; prNumber: number }) {
  const [details, setDetails] = useState<PRDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await authFetch(
          `/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/details`,
          { signal: controller.signal }
        );
        if (res.ok && !controller.signal.aborted) {
          setDetails(await res.json());
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      if (!controller.signal.aborted) setLoading(false);
    }
    load();
    return () => controller.abort();
  }, [owner, repo, prNumber]);

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5">
        <div className="animate-shimmer h-6 w-64 rounded mb-3" />
        <div className="animate-shimmer h-4 w-48 rounded" />
      </div>
    );
  }

  if (!details) return null;

  const stateConfig = STATE_CONFIG[details.state] || STATE_CONFIG.open;
  const checkConfig = details.checkStatus ? CHECK_CONFIG[details.checkStatus] : null;

  return (
    <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5 animate-scale-in">
      {/* Header: Title + State */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight break-words">
            {details.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <img
              src={details.author.avatarUrl}
              alt={details.author.login}
              className="h-5 w-5 rounded-full"
            />
            <span className="font-medium">{details.author.login}</span>
            <span>·</span>
            <span>{new Date(details.createdAt).toLocaleDateString("tr-TR")}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${stateConfig.bg} ${stateConfig.text}`}>
          {stateConfig.label}
        </span>
      </div>

      {/* Branch info */}
      <div className="mb-4 flex items-center gap-2 text-sm flex-wrap">
        <code className="rounded bg-[var(--color-accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent-text)] truncate max-w-[150px] sm:max-w-none">
          {details.baseBranch}
        </code>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
        <code className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 truncate max-w-[150px] sm:max-w-none">
          {details.headBranch}
        </code>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          </svg>
          <span className="text-[var(--color-text-muted)]">{details.changedFiles} dosya</span>
        </span>
        <span className="font-medium text-[var(--color-success)]">+{details.additions}</span>
        <span className="font-medium text-[var(--color-danger)]">-{details.deletions}</span>

        {/* CI Status */}
        {checkConfig && (
          <span className={`flex items-center gap-1 font-medium ${checkConfig.color}`}>
            <span>{checkConfig.icon}</span>
            CI: {checkConfig.label}
          </span>
        )}
      </div>

      {/* Reviewers */}
      {details.reviewers.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Reviewer:</span>
          <div className="flex -space-x-1.5">
            {details.reviewers.map((r) => (
              <img
                key={r.login}
                src={r.avatarUrl}
                alt={r.login}
                title={r.login}
                className="h-6 w-6 rounded-full ring-2 ring-[var(--color-bg-primary)]"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
