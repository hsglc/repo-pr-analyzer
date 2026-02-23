import type { AIProvider } from "../providers/ai-provider";
import type { ImpactResult, ParsedFile, TestScenario } from "../types";

export class TestGenerator {
  constructor(private aiProvider: AIProvider) {}

  async generate(
    impact: ImpactResult,
    files: ParsedFile[],
    maxScenarios: number
  ): Promise<TestScenario[]> {
    const diffSummary = files
      .map(
        (f) =>
          `${f.status.toUpperCase()} ${f.path} (+${f.additions}/-${f.deletions})`
      )
      .join("\n");

    return this.aiProvider.generateTestScenarios(
      impact,
      diffSummary,
      maxScenarios
    );
  }
}
