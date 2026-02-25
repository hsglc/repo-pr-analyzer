import { RiskBadge } from "./risk-badge";
import type { AnalysisReport } from "@/lib/core/types";

const RISK_PERCENT: Record<string, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 95,
};

const RISK_DONUT_COLOR: Record<string, string> = {
  low: "#16a34a",
  medium: "#d97706",
  high: "#ea580c",
  critical: "#dc2626",
};

export function ImpactSummary({ report }: { report: AnalysisReport }) {
  const { impact, stats } = report;
  const riskPercent = RISK_PERCENT[impact.riskLevel] || 50;
  const donutColor = RISK_DONUT_COLOR[impact.riskLevel] || "#6b7280";

  return (
    <div className="rounded-xl bg-[var(--color-bg-primary)] p-4 shadow-sm border border-[var(--color-border)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-[var(--color-text-primary)] sm:text-lg">Etki Ozeti</h3>
        <RiskBadge level={impact.riskLevel} />
      </div>

      <p className="mb-5 text-sm text-[var(--color-text-secondary)] break-words">{impact.summary}</p>

      {/* Stats Grid + Donut */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3">
          {/* Files Changed */}
          <div className="rounded-lg bg-[var(--color-accent-light)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              </svg>
              <span className="text-xs text-[var(--color-text-muted)]">Değişen dosya</span>
            </div>
            <p className="text-xl font-bold text-[var(--color-accent-text)]">{stats.filesChanged}</p>
          </div>

          {/* Additions */}
          <div className="rounded-lg bg-[var(--color-success-light)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="text-xs text-[var(--color-text-muted)]">Eklenen satır</span>
            </div>
            <p className="text-xl font-bold text-[var(--color-success)]">+{stats.additions}</p>
          </div>

          {/* Deletions */}
          <div className="rounded-lg bg-[var(--color-danger-light)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="text-xs text-[var(--color-text-muted)]">Silinen satır</span>
            </div>
            <p className="text-xl font-bold text-[var(--color-danger)]">-{stats.deletions}</p>
          </div>

          {/* Features Affected */}
          <div className="rounded-lg bg-[var(--color-warning-light)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 16-4 4-4-4"/>
                <path d="M17 20V4"/>
                <path d="m3 8 4-4 4 4"/>
                <path d="M7 4v16"/>
              </svg>
              <span className="text-xs text-[var(--color-text-muted)]">Etkilenen özellik</span>
            </div>
            <p className="text-xl font-bold text-[var(--color-warning)]">{stats.featuresAffected}</p>
          </div>
        </div>

        {/* CSS-only Donut Chart */}
        <div className="flex flex-col items-center justify-center mx-auto sm:mx-0">
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${donutColor} ${riskPercent * 3.6}deg, var(--color-bg-tertiary) ${riskPercent * 3.6}deg)`,
            }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-primary)]">
              <span className="text-lg font-bold text-[var(--color-text-primary)]">{riskPercent}%</span>
            </div>
          </div>
          <span className="mt-2 text-xs text-[var(--color-text-muted)]">Risk Skoru</span>
        </div>
      </div>

      {/* Affected Features */}
      {impact.features.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Etkilenen Özellikler</h4>
          <div className="flex flex-wrap gap-2">
            {impact.features.map((f) => (
              <span
                key={f.name}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  f.changeType === "direct"
                    ? "bg-[var(--color-accent-light)] text-[var(--color-accent-text)]"
                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                }`}
              >
                {f.name}
                <span className="text-[10px] opacity-70">
                  ({f.changeType === "direct" ? "doğrudan" : "dolaylı"})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {impact.services.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Etkilenen Servisler</h4>
          <div className="flex flex-wrap gap-2">
            {impact.services.map((s) => (
              <span
                key={s}
                className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {impact.pages.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Etkilenen Sayfalar</h4>
          <div className="flex flex-wrap gap-2">
            {impact.pages.map((p) => (
              <span
                key={p}
                className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900 dark:text-teal-300"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
