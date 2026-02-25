"use client";

import Link from "next/link";

interface PR {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  author: { login: string; avatarUrl: string };
  labels: { name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

interface AnalysisSummary {
  riskLevel: string;
  createdAt: string;
  commitSha: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a",
  medium: "#d97706",
  high: "#ea580c",
  critical: "#dc2626",
};

const RISK_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

function StateBadge({ state, merged }: { state: string; merged: boolean }) {
  if (merged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3"/>
          <circle cx="6" cy="6" r="3"/>
          <path d="M6 21V9a9 9 0 0 0 9 9"/>
        </svg>
        Birleştirildi
      </span>
    );
  }
  if (state === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Kapalı
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      Açık
    </span>
  );
}

export function PRListItem({
  pr,
  owner,
  repo,
  analysisSummary,
}: {
  pr: PR;
  owner: string;
  repo: string;
  analysisSummary?: AnalysisSummary;
}) {
  const riskColor = analysisSummary ? RISK_COLORS[analysisSummary.riskLevel] : undefined;

  return (
    <div className="gradient-border flex items-stretch rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden">
      {/* Left risk color bar */}
      {riskColor && (
        <div
          className="w-1 self-stretch shrink-0"
          style={{ backgroundColor: riskColor }}
        />
      )}

      <div className="flex flex-1 flex-col p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">#{pr.number}</span>
            <h3 className="font-semibold text-[var(--color-text-primary)] break-words">{pr.title}</h3>
            <StateBadge state={pr.state} merged={pr.merged} />
          </div>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              {pr.author.avatarUrl && (
                <img
                  src={pr.author.avatarUrl}
                  alt={pr.author.login}
                  className="h-5 w-5 rounded-full ring-1 ring-[var(--color-border)]"
                />
              )}
              <span className="font-medium">{pr.author.login}</span>
            </span>
            <span>{new Date(pr.createdAt).toLocaleDateString("tr-TR")}</span>
          </div>

          {pr.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pr.labels.map((label) => (
                <span
                  key={label.name}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}30`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {analysisSummary && (
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>{RISK_EMOJI[analysisSummary.riskLevel] || "⚪"} {analysisSummary.riskLevel}</span>
              <span>·</span>
              <span>Son analiz: {new Date(analysisSummary.createdAt).toLocaleDateString("tr-TR")}</span>
              <span>·</span>
              <code className="rounded bg-[var(--color-bg-tertiary)] px-1 py-0.5 text-[10px]">
                {analysisSummary.commitSha.substring(0, 7)}
              </code>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:ml-4 sm:shrink-0">
          <Link
            href={`/dashboard/${owner}/${repo}/pulls/${pr.number}`}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            Detay
          </Link>
          <Link
            href={`/dashboard/${owner}/${repo}/pulls/${pr.number}`}
            className="btn-glow rounded-lg px-4 py-2 text-sm font-medium text-white active:scale-95 transition-all"
            style={{ background: "var(--gradient-primary)" }}
          >
            {analysisSummary ? "Analizi Gör" : "Analiz Et"}
          </Link>
        </div>
      </div>
    </div>
  );
}
