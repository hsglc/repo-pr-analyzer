import { ImpactSummary } from "./impact-summary";
import { TestScenariosTable } from "./test-scenarios-table";
import type { AnalysisReport } from "@/lib/core/types";

export function AnalysisResult({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="rounded-lg bg-[var(--color-bg-primary)] p-4 shadow-sm">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          {report.prTitle}{" "}
          <span className="text-[var(--color-text-muted)]">#{report.prNumber}</span>
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {new Date(report.timestamp).toLocaleString("tr-TR")}
        </p>
      </div>

      <ImpactSummary report={report} />

      <TestScenariosTable scenarios={report.testScenarios} />
    </div>
  );
}
