import type { AnalysisReport } from "../types";

const RISK_EMOJI: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
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
      `**Ozet:** ${report.impact.summary}`,
      "",
      this.renderStatsTable(report, riskEmoji),
      "",
      this.renderFeatures(report),
      this.renderServicesAndPages(report.impact.services, report.impact.pages),
      `**Test Senaryolari:**`,
      "",
      this.renderTestTable(report.testScenarios),
      "",
      `---`,
      `_PR Etki Analizci tarafindan olusturulmustur._`,
      COMMENT_MARKER,
    ];

    return sections.join("\n");
  }

  private renderStatsTable(report: AnalysisReport, riskEmoji: string): string {
    return `| Metrik | Deger |
|--------|-------|
| Degisen dosya | ${report.stats.filesChanged} |
| Satir degisimi | +${report.stats.additions} / -${report.stats.deletions} |
| Etkilenen ozellik | ${report.stats.featuresAffected} |
| Risk | ${riskEmoji} ${report.impact.riskLevel.toUpperCase()} |`;
  }

  private renderFeatures(report: AnalysisReport): string {
    if (report.impact.features.length === 0) return "";

    let out = `**Etkilenen Ozellikler:**\n`;
    out += report.impact.features
      .map((f) => {
        const type = f.changeType === "direct" ? "dogrudan" : "dolayli";
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
    const header = `| # | Senaryo | Oncelik | Tip |
|---|---------|---------|-----|`;
    const rows = scenarios
      .map(
        (s) => `| ${s.id} | ${s.title} | ${s.priority} | ${s.type} |`
      )
      .join("\n");
    return `${header}\n${rows}`;
  }
}
