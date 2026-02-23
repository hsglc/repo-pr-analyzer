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
    <div className="gradient-border flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden">
      {/* Left risk color bar */}
      {riskColor && (
        <div
          className="w-1 self-stretch shrink-0"
          style={{ backgroundColor: riskColor }}
        />
      )}

      <div className="flex flex-1 items-center justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">#{pr.number}</span>
            <h3 className="font-semibold text-[var(--color-text-primary)]">{pr.title}</h3>
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

        <Link
          href={`/dashboard/${owner}/${repo}/pulls/${pr.number}`}
          className="btn-glow ml-4 rounded-lg px-4 py-2 text-sm font-medium text-white active:scale-95 transition-all"
          style={{ background: "var(--gradient-primary)" }}
        >
          {analysisSummary ? "Analizi Gör" : "Analiz Et"}
        </Link>
      </div>
    </div>
  );
}
