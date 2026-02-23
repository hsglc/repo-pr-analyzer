import type { AnalysisReport, TestScenario } from "../types";

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
      `# PR Etki Analizi Raporu`,
      `> Otomatik analiz - ${timestamp}`,
      "",
      `## Ozet`,
      "",
      report.impact.summary,
      "",
      this.renderStatsTable(report, riskEmoji),
      "",
      this.renderFeatures(report),
      this.renderServices(report.impact.services),
      this.renderPages(report.impact.pages),
      `## Test Senaryolari`,
      "",
      this.renderTestTable(report.testScenarios),
      "",
      `### Senaryo Detaylari`,
      "",
      report.testScenarios
        .map((s) => this.renderScenarioDetail(s))
        .join("\n\n---\n\n"),
      "",
      `---`,
      `_Bu rapor PR Impact Analyzer tarafindan otomatik olusturulmustur._`,
      COMMENT_MARKER,
    ];

    return sections.join("\n");
  }

  private renderStatsTable(report: AnalysisReport, riskEmoji: string): string {
    return `| Metrik | Deger |
|--------|-------|
| Degisen dosya | ${report.stats.filesChanged} |
| Eklenen satir | +${report.stats.additions} |
| Silinen satir | -${report.stats.deletions} |
| Etkilenen feature | ${report.stats.featuresAffected} |
| Risk seviyesi | ${riskEmoji} ${report.impact.riskLevel.toUpperCase()} |`;
  }

  private renderFeatures(report: AnalysisReport): string {
    const direct = report.impact.features.filter(
      (f) => f.changeType === "direct"
    );
    const indirect = report.impact.features.filter(
      (f) => f.changeType === "indirect"
    );

    let out = `## Etkilenen Feature'lar\n\n### Dogrudan Etkiler\n`;
    out += direct
      .map(
        (f) =>
          `- **${f.name}**: ${f.description}\n  - Dosyalar: ${f.affectedFiles.map((p) => `\`${p}\``).join(", ")}`
      )
      .join("\n");

    out += `\n\n### Dolayli Etkiler\n`;
    if (indirect.length > 0) {
      out += indirect
        .map((f) => `- **${f.name}**: ${f.description}`)
        .join("\n");
    } else {
      out += `_Dolayli etki tespit edilmedi._`;
    }

    return out + "\n";
  }

  private renderServices(services: string[]): string {
    if (services.length === 0) return "";
    return `## Etkilenen Servisler\n${services.map((s) => `- ${s}`).join("\n")}\n\n`;
  }

  private renderPages(pages: string[]): string {
    if (pages.length === 0) return "";
    return `## Etkilenen Sayfalar\n${pages.map((p) => `- ${p}`).join("\n")}\n\n`;
  }

  private renderTestTable(scenarios: TestScenario[]): string {
    const header = `| ID | Senaryo | Feature | Oncelik | Tip |
|-----|---------|---------|---------|-----|`;
    const rows = scenarios
      .map(
        (s) => `| ${s.id} | ${s.title} | ${s.feature} | ${s.priority} | ${s.type} |`
      )
      .join("\n");
    return `${header}\n${rows}`;
  }

  private renderScenarioDetail(scenario: TestScenario): string {
    return `#### ${scenario.id}: ${scenario.title}

- **Feature:** ${scenario.feature}
- **Oncelik:** ${scenario.priority}
- **Tip:** ${scenario.type}

**Adimlar:**
${scenario.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Beklenen Sonuc:** ${scenario.expectedResult}`;
  }
}
