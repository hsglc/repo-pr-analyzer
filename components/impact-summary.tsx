import { RiskBadge } from "./risk-badge";
import type { AnalysisReport } from "@/lib/core/types";

export function ImpactSummary({ report }: { report: AnalysisReport }) {
  const { impact, stats } = report;

  return (
    <div className="rounded-lg bg-[var(--color-bg-primary)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Etki Özeti</h3>
        <RiskBadge level={impact.riskLevel} />
      </div>

      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{impact.summary}</p>

      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-[var(--color-border)]">
            <td className="py-2 text-[var(--color-text-muted)]">Değişen dosya</td>
            <td className="py-2 text-right font-medium text-[var(--color-text-primary)]">{stats.filesChanged}</td>
          </tr>
          <tr className="border-b border-[var(--color-border)]">
            <td className="py-2 text-[var(--color-text-muted)]">Eklenen satır</td>
            <td className="py-2 text-right font-medium text-[var(--color-success)]">+{stats.additions}</td>
          </tr>
          <tr className="border-b border-[var(--color-border)]">
            <td className="py-2 text-[var(--color-text-muted)]">Silinen satır</td>
            <td className="py-2 text-right font-medium text-[var(--color-danger)]">-{stats.deletions}</td>
          </tr>
          <tr>
            <td className="py-2 text-[var(--color-text-muted)]">Etkilenen özellik</td>
            <td className="py-2 text-right font-medium text-[var(--color-text-primary)]">{stats.featuresAffected}</td>
          </tr>
        </tbody>
      </table>

      {impact.features.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Etkilenen Özellikler</h4>
          <div className="space-y-1">
            {impact.features.map((f) => (
              <div key={f.name} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    f.changeType === "direct" ? "bg-[var(--color-accent)]" : "bg-[var(--color-text-muted)]"
                  }`}
                />
                <span className="font-medium text-[var(--color-text-primary)]">{f.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  ({f.changeType === "direct" ? "doğrudan" : "dolaylı"})
                </span>
              </div>
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
                className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300"
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
                className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900 dark:text-teal-300"
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
