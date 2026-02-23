"use client";

import Link from "next/link";

interface PR {
  number: number;
  title: string;
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

const RISK_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

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
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-muted)]">#{pr.number}</span>
          <h3 className="font-semibold text-[var(--color-text-primary)]">{pr.title}</h3>
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            {pr.author.avatarUrl && (
              <img
                src={pr.author.avatarUrl}
                alt={pr.author.login}
                className="h-4 w-4 rounded-full"
              />
            )}
            {pr.author.login}
          </span>
          <span>{new Date(pr.createdAt).toLocaleDateString("tr-TR")}</span>
        </div>

        {pr.labels.length > 0 && (
          <div className="mt-2 flex gap-1">
            {pr.labels.map((label) => (
              <span
                key={label.name}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
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

      <Link
        href={`/dashboard/${owner}/${repo}/pulls/${pr.number}`}
        className="ml-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)] active:scale-95 transition-all"
      >
        {analysisSummary ? "Analizi Gör" : "Analiz Et"}
      </Link>
    </div>
  );
}
