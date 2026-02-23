import { minimatch } from "minimatch";
import type {
  ParsedFile,
  ImpactResult,
  FeatureImpact,
  ImpactMapConfig,
} from "../types";

export class ImpactAnalyzer {
  constructor(private config: ImpactMapConfig) {}

  analyze(files: ParsedFile[]): ImpactResult {
    const filteredFiles = files.filter(
      (f) => !this.config.ignorePatterns.some((p) => minimatch(f.path, p))
    );

    const features = this.findAffectedFeatures(filteredFiles);
    const services = this.findAffectedServices(filteredFiles);
    const pages = this.findAffectedPages(filteredFiles);
    const riskLevel = this.calculateRisk(filteredFiles, features);

    return {
      features,
      services,
      pages,
      riskLevel,
      summary: this.buildSummary(features, services, pages, riskLevel),
    };
  }

  private findAffectedFeatures(files: ParsedFile[]): FeatureImpact[] {
    const impacts: FeatureImpact[] = [];

    for (const [featureName, mapping] of Object.entries(this.config.features)) {
      const affectedFiles = files.filter((f) =>
        mapping.paths.some((pattern) => minimatch(f.path, pattern))
      );

      if (affectedFiles.length > 0) {
        impacts.push({
          name: featureName,
          affectedFiles: affectedFiles.map((f) => f.path),
          changeType: "direct",
          description: mapping.description,
        });

        if (mapping.relatedFeatures) {
          for (const related of mapping.relatedFeatures) {
            if (!impacts.some((i) => i.name === related)) {
              impacts.push({
                name: related,
                affectedFiles: [],
                changeType: "indirect",
                description:
                  this.config.features[related]?.description ||
                  `${featureName} ile iliskili`,
              });
            }
          }
        }
      }
    }

    return impacts;
  }

  private findAffectedServices(files: ParsedFile[]): string[] {
    const services: Set<string> = new Set();

    for (const [serviceName, patterns] of Object.entries(this.config.services)) {
      const isAffected = files.some((f) =>
        patterns.some((pattern) => minimatch(f.path, pattern))
      );
      if (isAffected) services.add(serviceName);
    }

    return [...services];
  }

  private findAffectedPages(files: ParsedFile[]): string[] {
    const pages: Set<string> = new Set();

    for (const [pageName, patterns] of Object.entries(this.config.pages)) {
      const isAffected = files.some((f) =>
        patterns.some((pattern) => minimatch(f.path, pattern))
      );
      if (isAffected) pages.add(pageName);
    }

    return [...pages];
  }

  private calculateRisk(
    files: ParsedFile[],
    features: FeatureImpact[]
  ): ImpactResult["riskLevel"] {
    const totalChanges = files.reduce(
      (sum, f) => sum + f.additions + f.deletions,
      0
    );
    const directFeatures = features.filter(
      (f) => f.changeType === "direct"
    ).length;

    if (totalChanges > 500 || directFeatures > 5) return "critical";
    if (totalChanges > 200 || directFeatures > 3) return "high";
    if (totalChanges > 50 || directFeatures > 1) return "medium";
    return "low";
  }

  private buildSummary(
    features: FeatureImpact[],
    services: string[],
    pages: string[],
    risk: ImpactResult["riskLevel"]
  ): string {
    const direct = features.filter((f) => f.changeType === "direct");
    const indirect = features.filter((f) => f.changeType === "indirect");

    let summary = `Bu PR **${direct.length}** feature'i dogrudan etkiliyor`;
    if (indirect.length > 0) {
      summary += ` ve **${indirect.length}** feature'i dolayli olarak etkileyebilir`;
    }
    summary += `. Risk seviyesi: **${risk.toUpperCase()}**.`;

    if (services.length > 0) {
      summary += ` Etkilenen servisler: ${services.join(", ")}.`;
    }
    if (pages.length > 0) {
      summary += ` Etkilenen sayfalar: ${pages.join(", ")}.`;
    }

    return summary;
  }
}
