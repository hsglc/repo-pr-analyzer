import type { CodeReviewItem, ImpactResult, TestScenario } from "../types";

export interface AIProvider {
  generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number
  ): Promise<TestScenario[]>;

  generateCodeReview(
    impact: ImpactResult,
    diffContent: string,
    maxItems: number
  ): Promise<CodeReviewItem[]>;
}
