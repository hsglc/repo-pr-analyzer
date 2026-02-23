import type { AnalysisReport, CodeReviewItem } from "../types";

const RISK_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟡",
  info: "🔵",
  suggestion: "💡",
};

export const COMMENT_MARKER = "<!-- pr-impact-analyzer -->";

export class ReportGenerator {
  generate(report: AnalysisReport): string {
    const riskEmoji = RISK_EMOJI[report.impact.riskLevel] || "⚪";
    const timestamp = new Date(report.timestamp).toLocaleString("tr-TR");

    const sections: string[] = [
      COMMENT_MARKER,
      `# PR Etki Analizi`,
      "",
      `> ${timestamp}`,
      "",
      `**Özet:** ${report.impact.summary}`,
      "",
      this.renderStatsTable(report, riskEmoji),
      "",
      this.renderFeatures(report),
      this.renderServicesAndPages(report.impact.services, report.impact.pages),
      `**Test Senaryoları:**`,
      "",
      this.renderTestTable(report.testScenarios),
      "",
    ];

    if (report.codeReview?.length > 0) {
      sections.push(
        `**Kod İnceleme Bulguları:**`,
        "",
        this.renderCodeReviewTable(report.codeReview),
        "",
      );
    }

    sections.push(
      `---`,
      `_PR Etki Analizci tarafından oluşturulmuştur._`,
      COMMENT_MARKER,
    );

    return sections.join("\n");
  }

  private renderStatsTable(report: AnalysisReport, riskEmoji: string): string {
    return `| Metrik | Değer |
|--------|-------|
| Değişen dosya | ${report.stats.filesChanged} |
| Satır değişimi | +${report.stats.additions} / -${report.stats.deletions} |
| Etkilenen özellik | ${report.stats.featuresAffected} |
| Risk | ${riskEmoji} ${report.impact.riskLevel.toUpperCase()} |`;
  }

  private renderFeatures(report: AnalysisReport): string {
    if (report.impact.features.length === 0) return "";

    let out = `**Etkilenen Özellikler:**\n`;
    out += report.impact.features
      .map((f) => {
        const type = f.changeType === "direct" ? "doğrudan" : "dolaylı";
        return `- **${f.name}** (${type}): ${f.description}`;
      })
      .join("\n");

    return out + "\n";
  }

  private renderServicesAndPages(services: string[], pages: string[]): string {
    if (services.length === 0 && pages.length === 0) return "";

    const parts: string[] = [];
    if (services.length > 0) {
      parts.push(`**Servisler:** ${services.join(", ")}`);
    }
    if (pages.length > 0) {
      parts.push(`**Sayfalar:** ${pages.join(", ")}`);
    }

    return parts.join(" | ") + "\n\n";
  }

  private renderTestTable(scenarios: import("../types").TestScenario[]): string {
    const header = `| # | Senaryo | Öncelik | Tip |
|---|---------|---------|-----|`;
    const rows = scenarios
      .map(
        (s) => `| ${s.id} | ${s.title} | ${s.priority} | ${s.type} |`
      )
      .join("\n");
    return `${header}\n${rows}`;
  }

  private renderCodeReviewTable(items: CodeReviewItem[]): string {
    const header = `| # | Severity | Kategori | Dosya | Başlık |
|---|----------|----------|-------|--------|`;
    const rows = items
      .map((item) => {
        const emoji = SEVERITY_EMOJI[item.severity] || "";
        const location = item.line ? `${item.file}:${item.line}` : item.file;
        return `| ${item.id} | ${emoji} ${item.severity} | ${item.category} | \`${location}\` | ${item.title} |`;
      })
      .join("\n");
    return `${header}\n${rows}`;
  }
}
