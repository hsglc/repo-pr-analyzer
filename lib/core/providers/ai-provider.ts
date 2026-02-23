import type { ImpactResult, TestScenario } from "../types";

export interface AIProvider {
  generateTestScenarios(
    impact: ImpactResult,
    diffSummary: string,
    maxScenarios: number
  ): Promise<TestScenario[]>;
}
